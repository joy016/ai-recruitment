using System.Net;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Services;
using ai_recruitment.Tests.Features.Users;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace ai_recruitment.Tests.Features.Inbox
{
    // TrySendAsync is a single attempt per call - InboxReceiveNotifyDispatcher is what retries
    // across calls with backoff - so these tests only assert the (delivered, retryable, error)
    // outcome of one attempt, never a retry loop. Mirrors N8nCandidateStatusWebhookServiceTests.
    public class N8nReceiveEmailWebhookServiceTests
    {
        private static N8nReceiveEmailPayload CreatePayload() => new()
        {
            MessageId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            ThreadId = "thread-123",
            From = new N8nReceiveEmailFromRef { Name = "Jane Candidate", Email = "jane@example.com" },
            To = ["hr@company.com"],
            Subject = "Application",
            BodyText = "Hello",
            ReceivedAt = new DateTime(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc),
        };

        private static N8nReceiveEmailWebhookService CreateService(
            StubHttpMessageHandler handler,
            Action<N8nReceiveEmailOptions>? configure = null)
        {
            var options = new N8nReceiveEmailOptions
            {
                WebhookUrl = "https://n8n.example.com/webhook/receive-email",
                WebhookSecret = "super-secret",
                MaxAttempts = 3,
            };

            configure?.Invoke(options);

            return new N8nReceiveEmailWebhookService(
                new HttpClient(handler),
                Options.Create(options),
                NullLogger<N8nReceiveEmailWebhookService>.Instance);
        }

        [Fact]
        public async Task TrySendAsync_PostsPayloadWithSecretAndIdempotencyHeaders()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler);
            var payload = CreatePayload();

            var (delivered, retryable, error) = await service.TrySendAsync(payload.MessageId, payload);

            delivered.Should().BeTrue();
            retryable.Should().BeFalse();
            error.Should().BeNull();

            var request = handler.Requests.Should().ContainSingle().Which;
            request.Method.Should().Be(HttpMethod.Post);
            request.RequestUri!.ToString().Should().Be("https://n8n.example.com/webhook/receive-email");
            request.Headers.GetValues("X-Webhook-Secret").Should().ContainSingle().Which.Should().Be("super-secret");
            request.Headers.GetValues("Idempotency-Key").Should().ContainSingle().Which.Should().Be(payload.MessageId.ToString());
            handler.Bodies[0].Should().Contain("\"message_id\":\"11111111-1111-1111-1111-111111111111\"");
            handler.Bodies[0].Should().Contain("\"body_text\":\"Hello\"");
        }

        [Fact]
        public async Task TrySendAsync_IsRetryable_OnServerError()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.InternalServerError);
            var service = CreateService(handler);
            var payload = CreatePayload();

            var (delivered, retryable, error) = await service.TrySendAsync(payload.MessageId, payload);

            delivered.Should().BeFalse();
            retryable.Should().BeTrue("a 500 may well succeed on a later attempt");
            error.Should().Contain("500");
        }

        [Fact]
        public async Task TrySendAsync_IsNotRetryable_OnClientError()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.Forbidden);
            var service = CreateService(handler);
            var payload = CreatePayload();

            var (delivered, retryable, _) = await service.TrySendAsync(payload.MessageId, payload);

            delivered.Should().BeFalse();
            retryable.Should().BeFalse("a rejected secret or inactive workflow won't be fixed by resending the same payload");
        }

        [Fact]
        public async Task TrySendAsync_DoesNotThrow_AndIsRetryable_WhenTheRequestThrows()
        {
            var handler = new StubHttpMessageHandler().Throws<HttpRequestException>();
            var service = CreateService(handler);
            var payload = CreatePayload();

            var (delivered, retryable, _) = await service.TrySendAsync(payload.MessageId, payload);

            delivered.Should().BeFalse();
            retryable.Should().BeTrue();
        }

        [Fact]
        public async Task TrySendAsync_RefusesPlainHttp_AndMakesNoRequest()
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.WebhookUrl = "http://n8n.example.com/webhook/receive-email");
            var payload = CreatePayload();

            var (delivered, _, _) = await service.TrySendAsync(payload.MessageId, payload);

            delivered.Should().BeFalse();
            handler.Requests.Should().BeEmpty();
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("not-a-url")]
        public async Task TrySendAsync_FailsWithoutRequest_WhenWebhookUrlIsMissingOrInvalid(string? webhookUrl)
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.WebhookUrl = webhookUrl);
            var payload = CreatePayload();

            var (delivered, retryable, _) = await service.TrySendAsync(payload.MessageId, payload);

            delivered.Should().BeFalse();
            retryable.Should().BeFalse("a configuration problem will not fix itself on retry");
            handler.Requests.Should().BeEmpty();
        }
    }
}
