using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Inbox.Services
{
    // Notifies n8n of every newly-saved inbound EmailMessage (N8nNotifiedAt == null) so a
    // downstream n8n workflow (AI classification, resume parsing, etc) can run on it - mirrors
    // InboxSendDispatcher's dual signal+sweep shape exactly, and reuses the same
    // AttemptCount/NextAttemptAt/ClaimedAt columns since they are never touched for inbound
    // messages by that other dispatcher (it only ever processes Status == Sending).
    public class InboxReceiveNotifyDispatcher : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(30);
        private static readonly TimeSpan StaleClaimTimeout = TimeSpan.FromMinutes(2);
        private const int SweepBatchSize = 20;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly InboxReceiveNotifyChannel _channel;
        private readonly N8nReceiveEmailOptions _options;
        private readonly ILogger<InboxReceiveNotifyDispatcher> _logger;

        public InboxReceiveNotifyDispatcher(
            IServiceScopeFactory scopeFactory,
            InboxReceiveNotifyChannel channel,
            IOptions<N8nReceiveEmailOptions> options,
            ILogger<InboxReceiveNotifyDispatcher> logger)
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
                    _logger.LogError(ex, "Inbox receive-notify dispatcher sweep failed.");
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
                .Where(m => m.Direction == EmailDirection.Inbound
                    && m.N8nNotifiedAt == null
                    && !m.N8nSyncFailed
                    && m.ClaimedAt != null
                    && m.ClaimedAt < staleCutoff)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.ClaimedAt, (DateTime?)null), stoppingToken);

            var dueIds = await context.EmailMessages
                .Where(m => m.Direction == EmailDirection.Inbound
                    && m.N8nNotifiedAt == null
                    && !m.N8nSyncFailed
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
            var webhookService = scope.ServiceProvider.GetRequiredService<IN8nReceiveEmailWebhookService>();
            var attachmentStorage = scope.ServiceProvider.GetRequiredService<IEmailAttachmentStorage>();

            // Claim (set ClaimedAt) before sending anything, so the instant signal and the
            // periodic sweep can never both deliver the same notification.
            var claimed = await context.EmailMessages
                .Where(m => m.Id == messageId
                    && m.Direction == EmailDirection.Inbound
                    && m.N8nNotifiedAt == null
                    && !m.N8nSyncFailed
                    && m.ClaimedAt == null)
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
                message.N8nNotifiedAt = DateTime.UtcNow;
                context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = messageId, Event = "n8n_notify_delivered" });
            }
            else
            {
                message.ClaimedAt = null;

                if (!retryable || message.AttemptCount >= Math.Max(1, _options.MaxAttempts))
                {
                    message.N8nSyncFailed = true;
                    message.NextAttemptAt = null;

                    context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = messageId, Event = "n8n_notify_failed" });

                    // No email body/subject or secret here - just the message id and attempt
                    // count, matching the PII-avoidance convention used across the other
                    // outbox dispatchers.
                    _logger.LogError(
                        "Giving up notifying n8n of inbound EmailMessage {MessageId} after {Attempts} attempt(s). Last error: {Error}",
                        messageId, message.AttemptCount, error);
                }
                else
                {
                    context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = messageId, Event = "n8n_notify_attempt_failed" });

                    var delaySeconds = Math.Min(300, Math.Pow(2, message.AttemptCount) * 5);
                    message.NextAttemptAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
        }

        private static async Task<N8nReceiveEmailPayload> BuildPayloadAsync(
            EmailMessage message,
            IEmailAttachmentStorage attachmentStorage,
            CancellationToken cancellationToken)
        {
            var attachmentRefs = new List<N8nReceiveEmailAttachmentRef>();
            foreach (var attachment in message.Attachments)
            {
                attachmentRefs.Add(new N8nReceiveEmailAttachmentRef
                {
                    Filename = attachment.Filename,
                    MimeType = attachment.MimeType,
                    Size = attachment.Size,
                    Url = await attachmentStorage.GetSignedUrlAsync(attachment.StorageUrl, cancellationToken),
                });
            }

            return new N8nReceiveEmailPayload
            {
                MessageId = message.Id,
                ThreadId = message.GmailThreadId ?? message.ThreadId.ToString(),
                From = new N8nReceiveEmailFromRef { Name = message.FromName, Email = message.FromEmail },
                To = message.ToEmails,
                Subject = message.Subject,
                BodyText = message.BodyText,
                ReceivedAt = message.ReceivedAt ?? message.CreatedAt,
                Attachments = attachmentRefs,
            };
        }
    }
}
