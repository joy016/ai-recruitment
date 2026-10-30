using ai_recruitment.Data;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Candidates.Services
{
    // Owns all actual HTTP delivery of candidate-status-changed events, so the HR request
    // that changes a candidate's status never waits on n8n. Two triggers feed it:
    //  - an immediate in-memory signal from CandidateStatusWebhookPublisher (handles the
    //    common case with near-zero latency), and
    //  - a periodic sweep of the CandidateStatusWebhookOutbox table (the durability
    //    guarantee: anything missed - e.g. the app restarted between the write and the
    //    signal, or a prior attempt failed with a retryable error - is still picked up).
    public class CandidateStatusOutboxDispatcher : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(30);
        private static readonly TimeSpan StaleClaimTimeout = TimeSpan.FromMinutes(2);
        private const int SweepBatchSize = 20;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly CandidateStatusOutboxChannel _channel;
        private readonly N8nCandidateStatusOptions _options;
        private readonly ILogger<CandidateStatusOutboxDispatcher> _logger;

        public CandidateStatusOutboxDispatcher(
            IServiceScopeFactory scopeFactory,
            CandidateStatusOutboxChannel channel,
            IOptions<N8nCandidateStatusOptions> options,
            ILogger<CandidateStatusOutboxDispatcher> logger)
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
                await foreach (var outboxId in _channel.Reader.ReadAllAsync(stoppingToken))
                {
                    await ProcessOneAsync(outboxId, stoppingToken);
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
                    _logger.LogError(ex, "Candidate-status webhook outbox sweep failed.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }

        private async Task SweepPendingAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;

            // Reclaim rows whose worker died mid-delivery (claimed "Sending" but never
            // reached Sent/Failed/Pending-with-backoff) so they aren't stuck forever.
            var staleCutoff = now - StaleClaimTimeout;
            await context.Set<CandidateStatusWebhookOutbox>()
                .Where(o => o.Status == "Sending" && o.ClaimedAt != null && o.ClaimedAt < staleCutoff)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.Status, "Pending")
                    .SetProperty(o => o.NextAttemptAt, (DateTime?)null), stoppingToken);

            var dueIds = await context.Set<CandidateStatusWebhookOutbox>()
                .Where(o => o.Status == "Pending" && (o.NextAttemptAt == null || o.NextAttemptAt <= now))
                .OrderBy(o => o.CreatedAt)
                .Take(SweepBatchSize)
                .Select(o => o.Id)
                .ToListAsync(stoppingToken);

            foreach (var id in dueIds)
            {
                await ProcessOneAsync(id, stoppingToken);
            }
        }

        private async Task ProcessOneAsync(Guid outboxId, CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var webhookService = scope.ServiceProvider.GetRequiredService<IN8nCandidateStatusWebhookService>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            // Atomically claims the row (Pending -> Sending) before sending anything, so the
            // instant signal and the periodic sweep can never both deliver the same event -
            // whichever one updates 0 rows here loses the race and backs off immediately.
            var claimed = await context.Set<CandidateStatusWebhookOutbox>()
                .Where(o => o.Id == outboxId && o.Status == "Pending")
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.Status, "Sending")
                    .SetProperty(o => o.ClaimedAt, DateTime.UtcNow), stoppingToken);

            if (claimed == 0)
            {
                return;
            }

            var entry = await context.Set<CandidateStatusWebhookOutbox>().FirstAsync(o => o.Id == outboxId, stoppingToken);
            entry.AttemptCount++;

            var (delivered, retryable, error) = await webhookService.TrySendAsync(entry, stoppingToken);

            if (delivered)
            {
                entry.Status = "Sent";
                entry.SentAt = DateTime.UtcNow;
                entry.LastError = null;
                entry.NextAttemptAt = null;
                entry.ClaimedAt = null;
            }
            else
            {
                entry.LastError = error;
                entry.ClaimedAt = null;

                if (!retryable || entry.AttemptCount >= Math.Max(1, _options.MaxAttempts))
                {
                    entry.Status = "Failed";
                    entry.NextAttemptAt = null;

                    _logger.LogError(
                        "Giving up on candidate-status-changed event {OutboxId} for Candidate {CandidateId} (new status '{NewStatus}') after {Attempts} attempt(s). Last error: {Error}",
                        entry.Id, entry.CandidateId, entry.NewStatus, entry.AttemptCount, error);

                    // Critical: HR needs to know a status-change email never reached n8n,
                    // regardless of whether they've turned off System notifications generally.
                    await notificationService.NotifyAsync(
                        NotificationType.SystemNotice,
                        new NotificationContext
                        {
                            Severity = NotificationSeverity.Warning,
                            Title = "Status Email Delivery Failed",
                            Message = "A candidate-status-changed event could not be delivered to n8n after repeated attempts and has been abandoned.",
                            CandidateId = entry.CandidateId,
                            JobId = entry.JobId,
                        },
                        $"system:candidate-status-outbox-failed:{entry.Id}",
                        stoppingToken,
                        critical: true);
                }
                else
                {
                    // Back to Pending (from Sending) so the next sweep is actually allowed
                    // to claim it again once the backoff elapses.
                    entry.Status = "Pending";

                    // Exponential backoff capped at 5 minutes.
                    var delaySeconds = Math.Min(300, Math.Pow(2, entry.AttemptCount) * 5);
                    entry.NextAttemptAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
        }
    }
}
