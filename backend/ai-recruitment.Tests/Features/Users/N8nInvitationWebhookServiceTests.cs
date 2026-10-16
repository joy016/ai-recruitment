using System.Net;
using System.Text.Json;
using ai_recruitment.Features.Users.Model;
using ai_recruitment.Features.Users.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace ai_recruitment.Tests.Features.Users
{
    // Captures every outgoing request and replies with a scripted sequence of statuses,
    // so the webhook client can be exercised without a real n8n instance.
    public class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Queue<Func<HttpRequestMessage, HttpResponseMessage>> _responses = new();

        public List<HttpRequestMessage> Requests { get; } = new();
        public List<string> Bodies { get; } = new();

        public StubHttpMessageHandler Respond(HttpStatusCode status, int times = 1)
        {
            for (var i = 0; i < times; i++)
            {
                _responses.Enqueue(_ => new HttpResponseMessage(status));
            }

            return this;
        }

        public StubHttpMessageHandler Throws<TException>(int times = 1) where TException : Exception, new()
        {
            for (var i = 0; i < times; i++)
            {
                _responses.Enqueue(_ => throw new TException());
            }

            return this;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            Bodies.Add(request.Content == null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken));

            if (_responses.Count == 0)
            {
                return new HttpResponseMessage(HttpStatusCode.OK);
            }

            return _responses.Dequeue().Invoke(request);
        }
    }

    public class N8nInvitationWebhookServiceTests
    {
        private static readonly User InvitedUser = new()
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            FirstName = "Jane",
            LastName = "Doe",
            Email = "doe.jane@company.com",
            PhoneNumber = "09171234567",
            EmployeeNumber = "EMP-JD123456",
            InsertedBy = "tester",
            RoleId = 3,
        };

        private static readonly Guid InvitationId = Guid.Parse("33333333-3333-3333-3333-333333333333");

        private static N8nInvitationWebhookService CreateService(
            StubHttpMessageHandler handler,
            Action<N8nInvitationOptions>? configure = null)
        {
            var options = new N8nInvitationOptions
            {
                WebhookUrl = "https://n8n.example.com/webhook/user-invitation-created",
                WebhookSecret = "super-secret",
                FrontendBaseUrl = "https://frontend.example.com/",
                MaxAttempts = 3,
            };

            configure?.Invoke(options);

            return new N8nInvitationWebhookService(
                new HttpClient(handler),
                Options.Create(options),
                NullLogger<N8nInvitationWebhookService>.Instance);
        }

        private static Task<bool> PublishAsync(N8nInvitationWebhookService service, string rawToken = "raw-token-value") =>
            service.PublishInvitationCreatedAsync(
                InvitedUser, InvitationId, rawToken, new DateTime(2026, 10, 16, 10, 0, 0, DateTimeKind.Utc));

        [Fact]
        public async Task PublishInvitationCreatedAsync_PostsExpectedPayloadAndSecretHeader()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler);

            var delivered = await PublishAsync(service);

            delivered.Should().BeTrue();
            handler.Requests.Should().ContainSingle();

            var request = handler.Requests[0];
            request.Method.Should().Be(HttpMethod.Post);
            request.RequestUri!.ToString().Should().Be("https://n8n.example.com/webhook/user-invitation-created");
            request.Headers.GetValues("X-Webhook-Secret").Should().ContainSingle().Which.Should().Be("super-secret");

            using var payload = JsonDocument.Parse(handler.Bodies[0]);
            var root = payload.RootElement;
            root.GetProperty("event").GetString().Should().Be("user.invitation.created");
            root.GetProperty("userId").GetGuid().Should().Be(InvitedUser.Id);
            root.GetProperty("invitationId").GetGuid().Should().Be(InvitationId);
            root.GetProperty("email").GetString().Should().Be(InvitedUser.Email);
            root.GetProperty("firstName").GetString().Should().Be("Jane");
            root.GetProperty("lastName").GetString().Should().Be("Doe");
            root.GetProperty("invitationUrl").GetString()
                .Should().Be("https://frontend.example.com/set-password?token=raw-token-value");
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_UrlEncodesTheToken()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler);

            await PublishAsync(service, "ab+cd/ef=");

            using var payload = JsonDocument.Parse(handler.Bodies[0]);
            payload.RootElement.GetProperty("invitationUrl").GetString()
                .Should().Be("https://frontend.example.com/set-password?token=ab%2Bcd%2Fef%3D");
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_RetriesServerErrors_ThenReportsFailure()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.InternalServerError, times: 3);
            var service = CreateService(handler);

            var delivered = await PublishAsync(service);

            delivered.Should().BeFalse();
            handler.Requests.Should().HaveCount(3, "5xx is retryable up to MaxAttempts");
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_SucceedsOnRetry_AfterATransientFailure()
        {
            var handler = new StubHttpMessageHandler()
                .Respond(HttpStatusCode.ServiceUnavailable)
                .Respond(HttpStatusCode.OK);
            var service = CreateService(handler);

            var delivered = await PublishAsync(service);

            delivered.Should().BeTrue();
            handler.Requests.Should().HaveCount(2);

            // The retry must carry the same InvitationId so n8n can deduplicate.
            var ids = handler.Bodies
                .Select(b => JsonDocument.Parse(b).RootElement.GetProperty("invitationId").GetGuid())
                .Distinct();
            ids.Should().ContainSingle().Which.Should().Be(InvitationId);
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_DoesNotRetryClientErrors()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.Forbidden, times: 3);
            var service = CreateService(handler);

            var delivered = await PublishAsync(service);

            delivered.Should().BeFalse();
            handler.Requests.Should().ContainSingle("a rejected secret or inactive workflow won't be fixed by resending");
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_ReportsFailure_WhenTheRequestThrows()
        {
            var handler = new StubHttpMessageHandler().Throws<HttpRequestException>(times: 3);
            var service = CreateService(handler);

            var delivered = await PublishAsync(service);

            delivered.Should().BeFalse();
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_RefusesPlainHttp_AndMakesNoRequest()
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.WebhookUrl = "http://n8n.example.com/webhook/user-invitation-created");

            var delivered = await PublishAsync(service);

            delivered.Should().BeFalse();
            handler.Requests.Should().BeEmpty("an invitation token must never travel over plain http");
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_AllowsLoopbackHttp_WhenInsecureHttpIsPermitted()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler, o =>
            {
                o.WebhookUrl = "http://localhost:5678/webhook/user-invitation-created";
                o.AllowInsecureHttp = true;
            });

            var delivered = await PublishAsync(service);

            delivered.Should().BeTrue("a locally-running n8n is reachable in Development");
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("not-a-url")]
        public async Task PublishInvitationCreatedAsync_ReportsFailure_WhenWebhookUrlIsMissingOrInvalid(string? webhookUrl)
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.WebhookUrl = webhookUrl);

            var delivered = await PublishAsync(service);

            delivered.Should().BeFalse();
            handler.Requests.Should().BeEmpty();
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_ReportsFailure_WhenFrontendBaseUrlIsMissing()
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.FrontendBaseUrl = null);

            var delivered = await PublishAsync(service);

            delivered.Should().BeFalse("without a frontend base URL there is no link to send");
            handler.Requests.Should().BeEmpty();
        }

        [Fact]
        public async Task PublishInvitationCreatedAsync_OmitsSecretHeader_WhenNoSecretIsConfigured()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler, o => o.WebhookSecret = null);

            await PublishAsync(service);

            handler.Requests[0].Headers.Contains("X-Webhook-Secret").Should().BeFalse();
        }
    }
}
