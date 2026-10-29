using ai_recruitment.Data;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Notifications.Services
{
    // Deletes notifications older than the configured retention window (Notifications:RetentionDays,
    // default 90). Runs once on startup and then every 24h - read notifications stay visible
    // right up to that cutoff, there is no separate "read" retention rule.
    public class NotificationCleanupService : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromHours(24);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly NotificationRetentionOptions _options;
        private readonly ILogger<NotificationCleanupService> _logger;

        public NotificationCleanupService(
            IServiceScopeFactory scopeFactory,
            IOptions<NotificationRetentionOptions> options,
            ILogger<NotificationCleanupService> logger)
        {
            _scopeFactory = scopeFactory;
            _options = options.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(SweepInterval);

            do
            {
                try
                {
                    await CleanupAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Notification retention cleanup failed.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }

        private async Task CleanupAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var cutoff = DateTime.UtcNow - TimeSpan.FromDays(Math.Max(1, _options.RetentionDays));

            var deleted = await context.Set<Notification>()
                .Where(n => n.CreatedAt < cutoff)
                .ExecuteDeleteAsync(cancellationToken);

            if (deleted > 0)
            {
                _logger.LogInformation("Deleted {Count} notification(s) older than {RetentionDays} day(s).", deleted, _options.RetentionDays);
            }
        }
    }
}
