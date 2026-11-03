namespace ai_recruitment.Features.Inbox.Model
{
    public enum EmailDirection
    {
        Inbound,
        Outbound,
    }

    // Draft -> Sending -> Sent, or Sending -> Failed (retryable attempts exhausted).
    // Received is used only for inbound messages (never transitions).
    public enum EmailStatus
    {
        Draft,
        Sending,
        Sent,
        Failed,
        Received,
    }

    // Display labels applied to a thread/message (see InboxQueryService's auto-labeling).
    // Stored as plain strings (List<string> on EmailMessage.Labels, matching the frontend's
    // LabelId union) rather than an enum array - Npgsql's EF provider maps List<string> to a
    // native text[] column with zero extra configuration, which an enum array would not.
    // Never written back to Candidate - the Inbox never changes candidate state.
    public static class EmailLabels
    {
        public const string Applicants = "applicants";
        public const string Interviews = "interviews";
        public const string Offers = "offers";
        public const string Rejections = "rejections";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Applicants, Interviews, Offers, Rejections,
        };
    }
}
