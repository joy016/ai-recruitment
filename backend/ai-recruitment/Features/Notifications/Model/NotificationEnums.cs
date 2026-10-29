namespace ai_recruitment.Features.Notifications.Model
{
    // What the user can toggle on the Settings > Notifications page. Deliberately smaller
    // in spirit than NotificationType: several types can - and do - share one category.
    public enum NotificationCategory
    {
        NewApplicant,
        InterviewScheduled,
        InterviewRescheduled,
        CandidateStatusChanged,
        JobPostUpdates,
        System,
        AiScreening,
        InterviewUpdates,
    }

    // The specific event being raised. Adding a new type only ever requires adding the enum
    // member here and one line in NotificationTypeMap - nothing else needs to change.
    public enum NotificationType
    {
        NewApplicant,
        InterviewScheduled,
        InterviewRescheduled,
        CandidateStatusChanged,
        JobPostUpdated,
        SystemNotice,
        AiScreeningPassed,
        AiScreeningNeedsReview,
        AiScreeningFailed,
        MeetingAccepted,
        MeetingDeclined,
        InterviewReminder,
    }

    public enum NotificationSeverity
    {
        Success,
        Warning,
        Info,
    }
}
