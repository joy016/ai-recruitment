using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.ApplicantScreening.Services
{
    // Owns all actual HTTP delivery of applicant-screening events, so the request thread
    // that creates a Candidate never waits on n8n. Two triggers feed it:
    //  - an immediate in-memory signal from ScreeningRequestPublisher (handles the common
    //    case with near-zero latency), and
    //  - a periodic sweep of the ScreeningWebhookOutbox table (the durability guarantee:
    //    anything missed - e.g. the app restarted between the write and the signal, or a
    //    prior attempt failed with a retryable error - is still picked up).
    public class ScreeningOutboxDispatcher : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(30);
        private static readonly TimeSpan StaleClaimTimeout = TimeSpan.FromMinutes(2);
        private const int SweepBatchSize = 20;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ScreeningOutboxChannel _channel;
        private readonly N8nScreeningOptions _options;
        private readonly ILogger<ScreeningOutboxDispatcher> _logger;

        public ScreeningOutboxDispatcher(
            IServiceScopeFactory scopeFactory,
            ScreeningOutboxChannel channel,
            IOptions<N8nScreeningOptions> options,
            ILogger<ScreeningOutboxDispatcher> logger)
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
                    _logger.LogError(ex, "Applicant-screening outbox sweep failed.");
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
            await context.Set<ScreeningWebhookOutbox>()
                .Where(o => o.Status == "Sending" && o.ClaimedAt != null && o.ClaimedAt < staleCutoff)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.Status, "Pending")
                    .SetProperty(o => o.NextAttemptAt, (DateTime?)null), stoppingToken);

            var dueIds = await context.Set<ScreeningWebhookOutbox>()
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
            var webhookService = scope.ServiceProvider.GetRequiredService<IApplicantScreeningWebhookService>();

            // Atomically claims the row (Pending -> Sending) before sending anything, so the
            // instant signal and the periodic sweep can never both deliver the same event -
            // whichever one updates 0 rows here loses the race and backs off immediately.
            var claimed = await context.Set<ScreeningWebhookOutbox>()
                .Where(o => o.Id == outboxId && o.Status == "Pending")
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.Status, "Sending")
                    .SetProperty(o => o.ClaimedAt, DateTime.UtcNow), stoppingToken);

            if (claimed == 0)
            {
                return;
            }

            var entry = await context.Set<ScreeningWebhookOutbox>().FirstAsync(o => o.Id == outboxId, stoppingToken);
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
                        "Giving up on applicant-screening event {OutboxId} for Candidate {CandidateId} after {Attempts} attempt(s). Last error: {Error}",
                        entry.Id, entry.CandidateId, entry.AttemptCount, error);
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
