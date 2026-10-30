using System.Text.Json;
using ai_recruitment.Data;
using ai_recruitment.Features.Candidates.Dto;
using ai_recruitment.Features.Candidates.model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Candidates.Services
{
    public class CandidateStatusWebhookPublisher : ICandidateStatusWebhookPublisher
    {
        private readonly AppDbContext _context;
        private readonly CandidateStatusOutboxChannel _channel;
        private readonly ILogger<CandidateStatusWebhookPublisher> _logger;

        public CandidateStatusWebhookPublisher(
            AppDbContext context,
            CandidateStatusOutboxChannel channel,
            ILogger<CandidateStatusWebhookPublisher> logger)
        {
            _context = context;
            _channel = channel;
            _logger = logger;
        }

        public async Task PublishAsync(
            Candidate candidate,
            string? previousStatusName,
            string newStatusName,
            string? changedBy,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Defensive re-check: the caller (CandidatesController) already decides
                // whether to call this at all, but CandidateStatusNotifications is kept as
                // the one place that knows the trigger set, so it's consulted again here
                // rather than trusting the caller's judgment silently.
                if (!CandidateStatusNotifications.TryGetEmailType(newStatusName, out var emailType))
                {
                    _logger.LogWarning(
                        "PublishAsync called for Candidate {CandidateId} with non-notifiable status '{NewStatus}'; nothing enqueued.",
                        candidate.Id, newStatusName);
                    return;
                }

                DateTime? interviewSchedule = null;
                string? interviewerName = null;
                if (CandidateStatusNotifications.IsInterviewStatus(newStatusName))
                {
                    if (candidate.InterviewSched.HasValue)
                    {
                        interviewSchedule = DateTime.SpecifyKind(candidate.InterviewSched.Value, DateTimeKind.Utc);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Candidate {CandidateId} moved to interview status '{NewStatus}' with no InterviewSched set; sending the webhook with interviewSchedule = null.",
                            candidate.Id, newStatusName);
                    }

                    if (candidate.InterviewerId.HasValue)
                    {
                        interviewerName = await _context.Users
                            .AsNoTracking()
                            .Where(u => u.Id == candidate.InterviewerId.Value)
                            .Select(u => u.FirstName + " " + u.LastName)
                            .FirstOrDefaultAsync(cancellationToken);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Candidate {CandidateId} moved to interview status '{NewStatus}' with no InterviewerId set; sending the webhook with interviewerName = null.",
                            candidate.Id, newStatusName);
                    }
                }

                var jobTitle = await _context.Jobs
                    .AsNoTracking()
                    .Where(j => j.JobId == candidate.JobId)
                    .Select(j => (string?)j.JobTitle)
                    .FirstOrDefaultAsync(cancellationToken);

                var payload = new CandidateStatusChangedWebhookPayload
                {
                    CandidateId = candidate.Id,
                    FirstName = candidate.FirstName,
                    LastName = candidate.LastName,
                    FullName = $"{candidate.FirstName} {candidate.LastName}".Trim(),
                    Email = candidate.EmailAddress,
                    JobId = candidate.JobId,
                    JobTitle = jobTitle,
                    PreviousStatus = previousStatusName,
                    NewStatus = newStatusName,
                    EmailType = emailType,
                    InterviewSchedule = interviewSchedule,
                    InterviewerName = interviewerName,
                    ChangedAt = DateTime.UtcNow,
                    ChangedBy = changedBy,
                };

                var outboxEntry = new CandidateStatusWebhookOutbox
                {
                    Id = Guid.NewGuid(),
                    CandidateId = candidate.Id,
                    JobId = candidate.JobId,
                    PreviousStatus = previousStatusName,
                    NewStatus = newStatusName,
                    EmailType = emailType,
                    Payload = JsonSerializer.Serialize(payload),
                    Status = "Pending",
                };

                _context.Set<CandidateStatusWebhookOutbox>().Add(outboxEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // Fire-and-forget nudge; the periodic sweep in CandidateStatusOutboxDispatcher
                // still picks this row up even if nobody is listening right now.
                _channel.SignalPending(outboxEntry.Id);
            }
            catch (Exception ex)
            {
                // Never let a webhook-publish failure fail the status update that already
                // succeeded.
                _logger.LogError(ex, "Failed to enqueue candidate-status-changed event for Candidate {CandidateId}.", candidate.Id);
            }
        }
    }
}
