using ai_recruitment.Data;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Notifications.Services
{
    // Every minute, finds candidates whose interview starts in about 2 hours and have not
    // already gotten a reminder, and raises one InterviewReminder notification each. Safe on
    // restart and with multiple instances: the window is wider than the sweep interval (so a
    // missed tick still catches the candidate next time) and the dedup key
    // "reminder:{candidateId}:2h" - enforced via the unique (RecipientUserId,
    // DeduplicationKey) index in NotificationService.NotifyAsync - means a candidate already
    // reminded is simply skipped, however many times the window re-matches them.
    public class InterviewReminderBackgroundService : BackgroundService
    {
        private static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(1);
        private static readonly TimeSpan ReminderLeadTime = TimeSpan.FromHours(2);
        private static readonly TimeSpan ReminderWindow = TimeSpan.FromMinutes(5);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<InterviewReminderBackgroundService> _logger;

        public InterviewReminderBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<InterviewReminderBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(SweepInterval);

            do
            {
                try
                {
                    await SweepAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Interview reminder sweep failed.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }

        private async Task SweepAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            var now = DateTime.UtcNow;
            var windowStart = now + ReminderLeadTime;
            var windowEnd = windowStart + ReminderWindow;

            var upcoming = await context.Candidates
                .AsNoTracking()
                .Where(c => c.InterviewSched != null && c.InterviewSched >= windowStart && c.InterviewSched < windowEnd)
                .Select(c => new
                {
                    c.Id,
                    c.FirstName,
                    c.LastName,
                    c.Role,
                    c.JobId,
                    InterviewSched = c.InterviewSched!.Value,
                })
                .ToListAsync(cancellationToken);

            foreach (var candidate in upcoming)
            {
                await notificationService.NotifyAsync(
                    NotificationType.InterviewReminder,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Info,
                        Title = "Interview Reminder",
                        Message = $"{candidate.FirstName} {candidate.LastName}'s interview for {candidate.Role} starts in about 2 hours.",
                        CandidateId = candidate.Id,
                        JobId = candidate.JobId,
                    },
                    $"reminder:{candidate.Id}:2h",
                    cancellationToken);
            }
        }
    }
}
