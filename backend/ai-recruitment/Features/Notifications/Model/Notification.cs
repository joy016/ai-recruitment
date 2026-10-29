using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.JobPosts.Model;
using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Notifications.Model
{
    // One row per recipient per event - never a shared row fanned out at read time, so
    // "mark as read" and retention cleanup are plain per-row operations.
    public class Notification
    {
        public Guid Id { get; set; }

        public Guid RecipientUserId { get; set; }
        public User Recipient { get; set; } = null!;

        public NotificationType Type { get; set; }
        public NotificationCategory Category { get; set; }
        public NotificationSeverity Severity { get; set; }

        public required string Title { get; set; }
        public required string Message { get; set; }

        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }

        public Guid? CandidateId { get; set; }
        public Candidate? Candidate { get; set; }

        public int? JobId { get; set; }
        public Job? Job { get; set; }

        // Reserved for when a dedicated Interview entity exists. This codebase models an
        // interview as fields (InterviewSched/InterviewerId) on Candidate rather than its own
        // row, so interview-related notifications correlate via CandidateId today and this
        // stays null - see INotificationService for the full note.
        public int? InterviewId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Scoped per-recipient (see the unique index on (RecipientUserId, DeduplicationKey) in
        // AppDbContext) so retrying the same upstream event - an n8n retry, a duplicate
        // PUT - never creates a second row for the same person.
        public required string DeduplicationKey { get; set; }
    }
}
