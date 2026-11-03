using ai_recruitment.Data;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Inbox.Controller;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Threading.Channels;
using Xunit;

namespace ai_recruitment.Tests.Features.Inbox
{
    // Covers the two guarantees asked of the n8n "receive email" notification hook:
    //  1. saving a new inbound email signals InboxReceiveNotifyDispatcher to deliver it, and
    //  2. that delivery never blocks or can fail the save itself, since it is a non-blocking
    //     channel write rather than an awaited HTTP call - see
    //     N8nReceiveEmailWebhookServiceTests for the webhook-failure-is-not-an-exception half
    //     of that guarantee.
    public class InboxWebhooksControllerInboundEmailTests
    {
        private static AppDbContext CreateContext() =>
            new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        private static InboxWebhooksController CreateController(AppDbContext context, InboxReceiveNotifyChannel channel)
        {
            var options = Options.Create(new N8nEmailOptions { SharedSecret = "super-secret" });

            var controller = new InboxWebhooksController(
                context,
                options,
                new NoCandidateLinkService(),
                new HtmlSanitizerService(),
                new NotUsedAttachmentStorage(),
                new NoopEventBroadcaster(),
                channel,
                NullLogger<InboxWebhooksController>.Instance);

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["x-webhook-secret"] = "super-secret";
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            return controller;
        }

        private static N8nInboundEmailDto CreateDto() => new()
        {
            GmailMessageId = "gmail-msg-1",
            GmailThreadId = "gmail-thread-1",
            FromEmail = "candidate@example.com",
            FromName = "Jane Candidate",
            To = ["hr@company.com"],
            Subject = "Application",
            BodyText = "Hello",
            ReceivedAt = new DateTime(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc),
        };

        [Fact]
        public async Task InboundEmail_SavesTheMessage_AndSignalsTheReceiveNotifyChannel()
        {
            var context = CreateContext();
            var channel = new InboxReceiveNotifyChannel();
            var controller = CreateController(context, channel);

            var result = await controller.InboundEmail(CreateDto(), default);

            result.Should().BeOfType<OkObjectResult>();
            var saved = await context.EmailMessages.SingleAsync();
            saved.GmailMessageId.Should().Be("gmail-msg-1");

            channel.Reader.TryRead(out var signaledId).Should().BeTrue();
            signaledId.Should().Be(saved.Id);
        }

        [Fact]
        public async Task InboundEmail_DoesNotSignalAgain_ForADuplicateGmailMessage()
        {
            var context = CreateContext();
            var channel = new InboxReceiveNotifyChannel();
            var controller = CreateController(context, channel);

            await controller.InboundEmail(CreateDto(), default);
            channel.Reader.TryRead(out _); // drain the first signal

            await controller.InboundEmail(CreateDto(), default);

            (await context.EmailMessages.CountAsync()).Should().Be(1);
            channel.Reader.TryRead(out _).Should().BeFalse("a duplicate Gmail message must never be notified twice");
        }

        private sealed class NoCandidateLinkService : IInboxCandidateLinkService
        {
            public Task<Candidate?> FindCandidateAsync(IEnumerable<string> emails, CancellationToken cancellationToken) =>
                Task.FromResult<Candidate?>(null);

            public Task<CandidateCardDto?> BuildCardAsync(Candidate candidate, CancellationToken cancellationToken) =>
                throw new NotSupportedException();

            public string ResolveLabelForStatus(string statusName) => throw new NotSupportedException();
        }

        private sealed class NotUsedAttachmentStorage : IEmailAttachmentStorage
        {
            public Task<UploadedAttachment> UploadAsync(Guid attachmentId, string filename, string contentType, Stream content, CancellationToken cancellationToken) =>
                throw new NotSupportedException();

            public Task<string> GetSignedUrlAsync(string storagePath, CancellationToken cancellationToken) =>
                throw new NotSupportedException();

            public Task DeleteAsync(string storagePath, CancellationToken cancellationToken) =>
                throw new NotSupportedException();
        }

        private sealed class NoopEventBroadcaster : IInboxEventBroadcaster
        {
            public (ChannelReader<string> Reader, IDisposable Subscription) Subscribe() => throw new NotSupportedException();

            public void Publish(string eventName, object payload)
            {
            }
        }
    }
}
