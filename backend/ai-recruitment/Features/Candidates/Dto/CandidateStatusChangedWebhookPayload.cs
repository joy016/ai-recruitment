using System.Text.Json.Serialization;

namespace ai_recruitment.Features.Candidates.Dto
{
    // Body POSTed to N8N_CANDIDATE_STATUS_WEBHOOK_URL ("candidate.status.changed").
    // Stored verbatim (already JSON-serialized) in CandidateStatusWebhookOutbox.Payload so
    // a retry resends exactly what was first built, even if the Candidate/Job rows have
    // since changed again.
    public class CandidateStatusChangedWebhookPayload
    {
        [JsonPropertyName("event")]
        public string Event { get; init; } = "candidate.status.changed";

        [JsonPropertyName("candidateId")]
        public Guid CandidateId { get; init; }

        [JsonPropertyName("firstName")]
        public string FirstName { get; init; } = string.Empty;

        [JsonPropertyName("lastName")]
        public string LastName { get; init; } = string.Empty;

        [JsonPropertyName("fullName")]
        public string FullName { get; init; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; init; } = string.Empty;

        [JsonPropertyName("jobId")]
        public int JobId { get; init; }

        [JsonPropertyName("jobTitle")]
        public string? JobTitle { get; init; }

        [JsonPropertyName("previousStatus")]
        public string? PreviousStatus { get; init; }

        [JsonPropertyName("newStatus")]
        public string NewStatus { get; init; } = string.Empty;

        // Derived from NewStatus via CandidateStatusNotifications - lets the n8n workflow
        // branch on a stable key instead of string-matching the status name itself.
        [JsonPropertyName("emailType")]
        public string EmailType { get; init; } = string.Empty;

        // UTC ISO 8601, or null when newStatus isn't an interview status, or when it is but
        // no schedule has been set yet (see CandidateStatusWebhookPublisher).
        [JsonPropertyName("interviewSchedule")]
        public DateTime? InterviewSchedule { get; init; }

        // The assigned interviewer's full name, or null when newStatus isn't an interview
        // status, or when it is but no interviewer has been assigned yet.
        [JsonPropertyName("interviewerName")]
        public string? InterviewerName { get; init; }

        [JsonPropertyName("changedAt")]
        public DateTime ChangedAt { get; init; }

        // HR user's email (from the caller's JWT), or null if it could not be resolved.
        [JsonPropertyName("changedBy")]
        public string? ChangedBy { get; init; }
    }
}
