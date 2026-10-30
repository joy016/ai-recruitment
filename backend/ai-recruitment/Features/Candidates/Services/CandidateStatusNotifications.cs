namespace ai_recruitment.Features.Candidates.Services
{
    // The single source of truth for "which candidate status changes send a
    // notification email via n8n, and which email template (emailType) they map to".
    // Statuses are matched by ApplicantStatus.StatusName (case-insensitive, trimmed) -
    // not by StatusId - because StatusId is just a seeded lookup-table row number with
    // no semantic meaning of its own. Adding a new notifiable status only ever requires
    // adding one entry here; nothing else needs to change.
    public static class CandidateStatusNotifications
    {
        private static readonly IReadOnlyDictionary<string, string> EmailTypeByStatusName =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Initial Interview"] = "interview",
                ["Technical Interview"] = "interview",
                ["Final Interview"] = "interview",
                ["Job Offer"] = "job_offer",
                ["Onboarding"] = "onboarding",
                ["Rejected"] = "rejection",
            };

        private static readonly HashSet<string> InterviewStatusNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "Initial Interview",
            "Technical Interview",
            "Final Interview",
        };

        // "Offered" is deliberately absent: confirmed with product that only "Job Offer"
        // triggers the job-offer email, not the separate "Offered" status.
        public static bool TryGetEmailType(string? statusName, out string emailType)
        {
            var trimmed = statusName?.Trim() ?? string.Empty;
            if (trimmed.Length == 0)
            {
                emailType = string.Empty;
                return false;
            }

            return EmailTypeByStatusName.TryGetValue(trimmed, out emailType!);
        }

        public static bool IsInterviewStatus(string? statusName) =>
            !string.IsNullOrWhiteSpace(statusName) && InterviewStatusNames.Contains(statusName.Trim());
    }
}
