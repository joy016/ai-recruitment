namespace ai_recruitment.Features.Notifications.Model
{
    // The single place a NotificationType resolves to the NotificationCategory a user can
    // toggle off. INotificationService.NotifyAsync and preference checks both go through
    // this map, so a new event only ever needs a new enum member here.
    public static class NotificationTypeMap
    {
        private static readonly IReadOnlyDictionary<NotificationType, NotificationCategory> CategoryByType =
            new Dictionary<NotificationType, NotificationCategory>
            {
                [NotificationType.NewApplicant] = NotificationCategory.NewApplicant,
                [NotificationType.InterviewScheduled] = NotificationCategory.InterviewScheduled,
                [NotificationType.InterviewRescheduled] = NotificationCategory.InterviewRescheduled,
                [NotificationType.CandidateStatusChanged] = NotificationCategory.CandidateStatusChanged,
                [NotificationType.JobPostUpdated] = NotificationCategory.JobPostUpdates,
                [NotificationType.SystemNotice] = NotificationCategory.System,
                [NotificationType.AiScreeningPassed] = NotificationCategory.AiScreening,
                [NotificationType.AiScreeningNeedsReview] = NotificationCategory.AiScreening,
                [NotificationType.AiScreeningFailed] = NotificationCategory.AiScreening,
                [NotificationType.MeetingAccepted] = NotificationCategory.InterviewUpdates,
                [NotificationType.MeetingDeclined] = NotificationCategory.InterviewUpdates,
                [NotificationType.InterviewReminder] = NotificationCategory.InterviewUpdates,
            };

        public static NotificationCategory GetCategory(NotificationType type) => CategoryByType[type];
    }
}
