using ai_recruitment.Data;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Candidates.Services
{
    // Extracted from CandidatesController.UpdateCandidateStatus so the recruiter UI and the
    // AI-screening callback (ApplicantScreeningController) drive previousStatus/newStatus,
    // ChangedAt and the webhook outbox through exactly the same code path.
    public class CandidateStatusChangeService : ICandidateStatusChangeService
    {
        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ICandidateStatusWebhookPublisher _candidateStatusWebhookPublisher;

        public CandidateStatusChangeService(
            AppDbContext context,
            INotificationService notificationService,
            ICandidateStatusWebhookPublisher candidateStatusWebhookPublisher)
        {
            _context = context;
            _notificationService = notificationService;
            _candidateStatusWebhookPublisher = candidateStatusWebhookPublisher;
        }

        public bool StageStatusChange(Candidate candidate, int newStatusId)
        {
            if (candidate.ApplicantStatusId == newStatusId)
            {
                return false;
            }

            candidate.ApplicantStatusId = newStatusId;
            candidate.UpdatedAt = DateTime.UtcNow;
            return true;
        }

        public async Task NotifyStatusChangedAsync(
            Candidate candidate,
            int previousStatusId,
            int newStatusId,
            string? changedBy,
            CancellationToken cancellationToken = default)
        {
            var statusName = await _context.ApplicantStatuses
                .AsNoTracking()
                .Where(s => s.StatusId == newStatusId)
                .Select(s => s.StatusName)
                .FirstOrDefaultAsync(cancellationToken) ?? "a new stage";

            await _notificationService.NotifyAsync(
                NotificationType.CandidateStatusChanged,
                new NotificationContext
                {
                    Severity = NotificationSeverity.Info,
                    Title = "Candidate Status Changed",
                    Message = $"{candidate.FirstName} {candidate.LastName} moved to {statusName}.",
                    CandidateId = candidate.Id,
                    JobId = candidate.JobId,
                },
                $"status:{candidate.Id}:{newStatusId}",
                cancellationToken);

            // Candidate status-change emails (interview/offer/onboarding/rejection) via n8n -
            // only for the specific statuses CandidateStatusNotifications knows about (the "a
            // new stage" fallback above never matches that set).
            if (CandidateStatusNotifications.TryGetEmailType(statusName, out _))
            {
                var previousStatusName = await _context.ApplicantStatuses
                    .AsNoTracking()
                    .Where(s => s.StatusId == previousStatusId)
                    .Select(s => s.StatusName)
                    .FirstOrDefaultAsync(cancellationToken);

                await _candidateStatusWebhookPublisher.PublishAsync(
                    candidate,
                    previousStatusName,
                    statusName,
                    changedBy,
                    cancellationToken);
            }
        }
    }
}
