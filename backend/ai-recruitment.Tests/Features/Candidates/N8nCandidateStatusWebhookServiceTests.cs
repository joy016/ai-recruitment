using System.Net;
using System.Text.Json;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Candidates.Services;
using ai_recruitment.Tests.Features.Users;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace ai_recruitment.Tests.Features.Candidates
{
    // TrySendAsync is a single attempt per call - CandidateStatusOutboxDispatcher is what
    // retries across calls with backoff - so these tests only assert the
    // (delivered, retryable, error) outcome of one attempt, never a retry loop.
    public class N8nCandidateStatusWebhookServiceTests
    {
        private static CandidateStatusWebhookOutbox CreateOutboxEntry(string payload = "{\"candidateId\":\"11111111-1111-1111-1111-111111111111\"}") =>
            new()
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                CandidateId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                JobId = 1,
                PreviousStatus = "AI Screening passed",
                NewStatus = "Rejected",
                EmailType = "rejection",
                Payload = payload,
                Status = "Sending",
            };

        private static N8nCandidateStatusWebhookService CreateService(
            StubHttpMessageHandler handler,
            Action<N8nCandidateStatusOptions>? configure = null)
        {
            var options = new N8nCandidateStatusOptions
            {
                WebhookUrl = "https://n8n.example.com/webhook/candidate-status-changed",
                WebhookSecret = "super-secret",
                MaxAttempts = 3,
            };

            configure?.Invoke(options);

            return new N8nCandidateStatusWebhookService(
                new HttpClient(handler),
                Options.Create(options),
                NullLogger<N8nCandidateStatusWebhookService>.Instance);
        }

        [Fact]
        public async Task TrySendAsync_PostsPayloadVerbatimWithSecretAndIdempotencyHeaders()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler);
            var entry = CreateOutboxEntry();

            var (delivered, retryable, error) = await service.TrySendAsync(entry);

            delivered.Should().BeTrue();
            retryable.Should().BeFalse();
            error.Should().BeNull();

            var request = handler.Requests.Should().ContainSingle().Which;
            request.Method.Should().Be(HttpMethod.Post);
            request.RequestUri!.ToString().Should().Be("https://n8n.example.com/webhook/candidate-status-changed");
            request.Headers.GetValues("X-Webhook-Secret").Should().ContainSingle().Which.Should().Be("super-secret");
            request.Headers.GetValues("Idempotency-Key").Should().ContainSingle().Which.Should().Be(entry.Id.ToString());
            handler.Bodies[0].Should().Be(entry.Payload);
        }

        [Fact]
        public async Task TrySendAsync_IsRetryable_OnServerError()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.InternalServerError);
            var service = CreateService(handler);

            var (delivered, retryable, error) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            retryable.Should().BeTrue("a 500 may well succeed on a later attempt");
            error.Should().Contain("500");
        }

        [Fact]
        public async Task TrySendAsync_IsNotRetryable_OnClientError()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.Forbidden);
            var service = CreateService(handler);

            var (delivered, retryable, error) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            retryable.Should().BeFalse("a rejected secret or inactive workflow won't be fixed by resending the same payload");
        }

        [Fact]
        public async Task TrySendAsync_DoesNotThrow_AndIsRetryable_WhenTheRequestThrows()
        {
            var handler = new StubHttpMessageHandler().Throws<HttpRequestException>();
            var service = CreateService(handler);

            var (delivered, retryable, _) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            retryable.Should().BeTrue();
        }

        [Fact]
        public async Task TrySendAsync_DoesNotThrow_AndIsRetryable_WhenTheRequestTimesOut()
        {
            var handler = new StubHttpMessageHandler().Throws<TaskCanceledException>();
            var service = CreateService(handler);

            var (delivered, retryable, error) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            retryable.Should().BeTrue();
            error.Should().Contain("timed out");
        }

        [Fact]
        public async Task TrySendAsync_FailsWithoutRequest_WhenDisabled()
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.Enabled = false);

            var (delivered, retryable, _) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            retryable.Should().BeFalse();
            handler.Requests.Should().BeEmpty();
        }

        [Fact]
        public async Task TrySendAsync_RefusesPlainHttp_AndMakesNoRequest()
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.WebhookUrl = "http://n8n.example.com/webhook/candidate-status-changed");

            var (delivered, _, _) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            handler.Requests.Should().BeEmpty();
        }

        [Fact]
        public async Task TrySendAsync_AllowsLoopbackHttp_WhenInsecureHttpIsPermitted()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler, o =>
            {
                o.WebhookUrl = "http://localhost:5678/webhook-test/interview-sched";
                o.AllowInsecureHttp = true;
            });

            var (delivered, _, _) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeTrue("a locally-running n8n is reachable in Development");
        }

        [Fact]
        public async Task TrySendAsync_OmitsSecretHeader_WhenNoSecretIsConfigured()
        {
            var handler = new StubHttpMessageHandler().Respond(HttpStatusCode.OK);
            var service = CreateService(handler, o => o.WebhookSecret = null);

            await service.TrySendAsync(CreateOutboxEntry());

            handler.Requests[0].Headers.Contains("X-Webhook-Secret").Should().BeFalse();
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("not-a-url")]
        public async Task TrySendAsync_FailsWithoutRequest_WhenWebhookUrlIsMissingOrInvalid(string? webhookUrl)
        {
            var handler = new StubHttpMessageHandler();
            var service = CreateService(handler, o => o.WebhookUrl = webhookUrl);

            var (delivered, retryable, _) = await service.TrySendAsync(CreateOutboxEntry());

            delivered.Should().BeFalse();
            retryable.Should().BeFalse("a configuration problem will not fix itself on retry");
            handler.Requests.Should().BeEmpty();
        }
    }
}
