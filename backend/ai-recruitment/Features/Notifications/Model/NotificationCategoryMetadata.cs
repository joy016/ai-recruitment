namespace ai_recruitment.Features.Notifications.Model
{
    // Label/description text + default on/off state for every toggleable category, shared by
    // the preferences GET (effective values for a user with no stored rows yet) and PUT
    // (validating/echoing a category) endpoints.
    public static class NotificationCategoryMetadata
    {
        public sealed record Entry(string Label, string Description, bool DefaultEnabled);

        private static readonly IReadOnlyDictionary<NotificationCategory, Entry> Entries =
            new Dictionary<NotificationCategory, Entry>
            {
                [NotificationCategory.NewApplicant] = new(
                    "New Applicant", "When a new candidate applies", DefaultEnabled: true),
                [NotificationCategory.InterviewScheduled] = new(
                    "Interview Scheduled", "When an interview is scheduled", DefaultEnabled: true),
                [NotificationCategory.InterviewRescheduled] = new(
                    "Interview Rescheduled", "When an interview is changed", DefaultEnabled: true),
                [NotificationCategory.CandidateStatusChanged] = new(
                    "Candidate Status Changed", "When a candidate moves to another recruitment stage", DefaultEnabled: true),
                [NotificationCategory.JobPostUpdates] = new(
                    "Job Post Updates", "Changes to job posts", DefaultEnabled: false),
                [NotificationCategory.System] = new(
                    "System Notifications", "Important system notifications", DefaultEnabled: true),
                [NotificationCategory.AiScreening] = new(
                    "AI Screening", "AI screening results for candidates (passed, needs review, or failed)", DefaultEnabled: true),
                [NotificationCategory.InterviewUpdates] = new(
                    "Interview Updates", "Meeting responses and interview reminders", DefaultEnabled: true),
            };

        public static IReadOnlyDictionary<NotificationCategory, Entry> All => Entries;

        public static Entry Get(NotificationCategory category) => Entries[category];

        public static bool DefaultEnabled(NotificationCategory category) => Entries[category].DefaultEnabled;
    }
}
