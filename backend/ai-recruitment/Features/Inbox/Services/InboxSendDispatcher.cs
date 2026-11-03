using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Inbox.Services
{
    // Delivers the outbound HTTP hand-off to n8n for every EmailMessage with Status=Sending -
    // mirrors CandidateStatusOutboxDispatcher's dual signal+sweep shape exactly. Important: a
    // successful delivery here only means n8n *accepted the request* (its Webhook node
    // responds immediately per n8n/send-email.workflow.json) - it does not mean Gmail actually
    // sent the email. The message stays Status=Sending until n8n's later callback to
    // POST /api/webhooks/n8n/send-result reports the real outcome (see InboxWebhooksController).
    // This dispatcher only ever flips a message to Failed itself - when the hand-off to n8n
    // could not be completed after MaxAttempts.
    public class InboxSendDispatcher : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(30);
        private static readonly TimeSpan StaleClaimTimeout = TimeSpan.FromMinutes(2);
        private const int SweepBatchSize = 20;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly InboxSendChannel _channel;
        private readonly N8nEmailOptions _options;
        private readonly ILogger<InboxSendDispatcher> _logger;

        public InboxSendDispatcher(
            IServiceScopeFactory scopeFactory,
            InboxSendChannel channel,
            IOptions<N8nEmailOptions> options,
            ILogger<InboxSendDispatcher> logger)
        {
            _scopeFactory = scopeFactory;
            _channel = channel;
            _options = options.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var signalLoop = ConsumeSignalsAsync(stoppingToken);
            var sweepLoop = SweepLoopAsync(stoppingToken);
            await Task.WhenAll(signalLoop, sweepLoop);
        }

        private async Task ConsumeSignalsAsync(CancellationToken stoppingToken)
        {
            try
            {
                await foreach (var messageId in _channel.Reader.ReadAllAsync(stoppingToken))
                {
                    await ProcessOneAsync(messageId, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Normal shutdown.
            }
        }

        private async Task SweepLoopAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(SweepInterval);

            do
            {
                try
                {
                    await SweepPendingAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Inbox send dispatcher sweep failed.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }

        private async Task SweepPendingAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;

            var staleCutoff = now - StaleClaimTimeout;
            await context.EmailMessages
                .Where(m => m.Status == EmailStatus.Sending && m.ClaimedAt != null && m.ClaimedAt < staleCutoff)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.ClaimedAt, (DateTime?)null), stoppingToken);

            var dueIds = await context.EmailMessages
                .Where(m => m.Status == EmailStatus.Sending
                    && m.ClaimedAt == null
                    && (m.NextAttemptAt == null || m.NextAttemptAt <= now))
                .OrderBy(m => m.CreatedAt)
                .Take(SweepBatchSize)
                .Select(m => m.Id)
                .ToListAsync(stoppingToken);

            foreach (var id in dueIds)
            {
                await ProcessOneAsync(id, stoppingToken);
            }
        }

        private async Task ProcessOneAsync(Guid messageId, CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var webhookService = scope.ServiceProvider.GetRequiredService<IN8nEmailWebhookService>();
            var attachmentStorage = scope.ServiceProvider.GetRequiredService<IEmailAttachmentStorage>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
            var broadcaster = scope.ServiceProvider.GetRequiredService<IInboxEventBroadcaster>();

            // Claim (set ClaimedAt) before sending anything, so the instant signal and the
            // periodic sweep can never both deliver the same hand-off.
            var claimed = await context.EmailMessages
                .Where(m => m.Id == messageId && m.Status == EmailStatus.Sending && m.ClaimedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.ClaimedAt, DateTime.UtcNow), stoppingToken);

            if (claimed == 0)
            {
                return;
            }

            var message = await context.EmailMessages
                .Include(m => m.Attachments)
                .FirstAsync(m => m.Id == messageId, stoppingToken);
            message.AttemptCount++;

            var payload = await BuildPayloadAsync(message, attachmentStorage, stoppingToken);
            var (delivered, retryable, error) = await webhookService.TrySendAsync(messageId, payload, stoppingToken);

            if (delivered)
            {
                message.ClaimedAt = null;
                message.NextAttemptAt = null;
                context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = messageId, Event = "n8n_accepted" });
            }
            else
            {
                message.ClaimedAt = null;

                if (!retryable || message.AttemptCount >= Math.Max(1, _options.MaxAttempts))
                {
                    message.Status = EmailStatus.Failed;
                    message.ErrorMessage = error;
                    message.NextAttemptAt = null;

                    context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = messageId, Event = "send_failed" });

                    _logger.LogError(
                        "Giving up handing EmailMessage {MessageId} to n8n after {Attempts} attempt(s). Last error: {Error}",
                        messageId, message.AttemptCount, error);

                    await notificationService.NotifyAsync(
                        NotificationType.SystemNotice,
                        new NotificationContext
                        {
                            Severity = NotificationSeverity.Warning,
                            Title = "Email Delivery Failed",
                            Message = $"An outbound email (\"{message.Subject}\") could not be handed off to n8n after repeated attempts.",
                        },
                        $"system:inbox-send-failed:{message.Id}",
                        stoppingToken,
                        critical: true);

                    broadcaster.Publish("message.failed", new { messageId = message.Id, error });
                }
                else
                {
                    context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = messageId, Event = "send_attempt_failed" });

                    var delaySeconds = Math.Min(300, Math.Pow(2, message.AttemptCount) * 5);
                    message.NextAttemptAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
        }

        private async Task<N8nSendEmailPayload> BuildPayloadAsync(
            EmailMessage message,
            IEmailAttachmentStorage attachmentStorage,
            CancellationToken cancellationToken)
        {
            var attachmentRefs = new List<N8nAttachmentRef>();
            foreach (var attachment in message.Attachments)
            {
                attachmentRefs.Add(new N8nAttachmentRef
                {
                    Filename = attachment.Filename,
                    MimeType = attachment.MimeType,
                    Url = await attachmentStorage.GetSignedUrlAsync(attachment.StorageUrl, cancellationToken),
                });
            }

            N8nReplyToRef? replyTo = null;
            if (!string.IsNullOrWhiteSpace(message.InReplyToGmailMessageId) && !string.IsNullOrWhiteSpace(message.GmailThreadId))
            {
                replyTo = new N8nReplyToRef
                {
                    GmailThreadId = message.GmailThreadId!,
                    GmailMessageId = message.InReplyToGmailMessageId!,
                };
            }

            return new N8nSendEmailPayload
            {
                MessageId = message.Id,
                SenderName = message.FromName,
                SenderEmail = message.FromEmail,
                To = message.ToEmails,
                Cc = message.CcEmails,
                Bcc = message.BccEmails,
                Subject = message.Subject,
                BodyHtml = message.BodyHtml,
                BodyText = message.BodyText,
                Attachments = attachmentRefs,
                ReplyTo = replyTo,
                CallbackUrl = $"{_options.AppBaseUrl?.TrimEnd('/')}/api/webhooks/n8n/send-result",
            };
        }
    }
}
