using ai_recruitment.Features.Notifications.Model;

namespace ai_recruitment.Features.Notifications
{
    // The event-specific content a trigger point hands to INotificationService.NotifyAsync.
    // Everything recipient-related (who gets it, whether it's filtered by preference) is
    // resolved by the service from the NotificationType, not from this.
    public class NotificationContext
    {
        public required NotificationSeverity Severity { get; set; }
        public required string Title { get; set; }
        public required string Message { get; set; }

        public Guid? CandidateId { get; set; }
        public int? JobId { get; set; }

        // See Notification.InterviewId - always null until a dedicated Interview entity exists.
        public int? InterviewId { get; set; }
    }
}
