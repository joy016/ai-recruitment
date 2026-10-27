using System.Text.Json.Serialization;

namespace ai_recruitment.Features.ApplicantScreening.Dto
{
    // Body POSTed to N8N_SCREENING_WEBHOOK_URL ("applicant-screening"). Every field under
    // Job comes straight from the Jobs row for candidate.JobId - nothing here is specific
    // to any one job title, so the same payload shape fits every position.
    public class ApplicantScreeningWebhookPayload
    {
        [JsonPropertyName("eventType")]
        public string EventType { get; init; } = "applicant.submitted";

        // Stable for the lifetime of this outbox row - the same value is resent on every
        // retry of the same event (see ScreeningRequestPublisher/ScreeningOutboxDispatcher),
        // so the n8n workflow can deduplicate instead of starting AI screening twice for
        // one submission. Also sent as the Idempotency-Key header.
        [JsonPropertyName("idempotencyKey")]
        public Guid IdempotencyKey { get; init; }

        [JsonPropertyName("candidateId")]
        public Guid CandidateId { get; init; }

        [JsonPropertyName("jobId")]
        public int JobId { get; init; }

        [JsonPropertyName("candidate")]
        public CandidateWebhookDto Candidate { get; init; } = null!;

        [JsonPropertyName("job")]
        public JobRequirementsWebhookDto Job { get; init; } = null!;

        [JsonPropertyName("resume")]
        public ResumeWebhookDto Resume { get; init; } = null!;

        [JsonPropertyName("submittedAt")]
        public DateTime SubmittedAt { get; init; }
    }

    public class CandidateWebhookDto
    {
        [JsonPropertyName("firstName")]
        public string FirstName { get; init; } = string.Empty;

        [JsonPropertyName("lastName")]
        public string LastName { get; init; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; init; } = string.Empty;

        [JsonPropertyName("phoneNumber")]
        public string PhoneNumber { get; init; } = string.Empty;

        [JsonPropertyName("yearsOfExperience")]
        public int YearsOfExperience { get; init; }

        [JsonPropertyName("linkedInProfile")]
        public string? LinkedInProfile { get; init; }

        [JsonPropertyName("coverLetter")]
        public string? CoverLetter { get; init; }
    }

    // Mirrors the Job entity's own fields (Features/JobPosts/Model/Job.cs) exactly - no
    // renaming, no invented fields. RequiredExperience/EducationRequirements are not
    // separate columns on Job today, so they are intentionally omitted here rather than
    // being guessed at or hardcoded; Qualifications already carries that information in
    // whatever free-text form HR entered it.
    public class JobRequirementsWebhookDto
    {
        [JsonPropertyName("jobId")]
        public int JobId { get; init; }

        [JsonPropertyName("title")]
        public string Title { get; init; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; init; } = string.Empty;

        [JsonPropertyName("department")]
        public string Department { get; init; } = string.Empty;

        [JsonPropertyName("jobType")]
        public string JobType { get; init; } = string.Empty;

        [JsonPropertyName("location")]
        public string Location { get; init; } = string.Empty;

        [JsonPropertyName("qualifications")]
        public string[] Qualifications { get; init; } = Array.Empty<string>();

        [JsonPropertyName("technicalSkills")]
        public string[] TechnicalSkills { get; init; } = Array.Empty<string>();
    }

    // Resume lives in the private Supabase "resume" bucket. Bucket/FilePath are what gets
    // persisted in the outbox row's Payload (stable, reusable); DownloadUrl is deliberately
    // mutable and left null here - N8nApplicantScreeningWebhookService fills it in with a
    // freshly generated Supabase signed URL immediately before every send, including
    // retries, so an outbox row sitting in the queue for a while never ships an expired link.
    public class ResumeWebhookDto
    {
        [JsonPropertyName("fileName")]
        public string FileName { get; init; } = string.Empty;

        [JsonPropertyName("storageProvider")]
        public string StorageProvider { get; init; } = "supabase";

        [JsonPropertyName("bucket")]
        public string Bucket { get; init; } = string.Empty;

        [JsonPropertyName("filePath")]
        public string FilePath { get; init; } = string.Empty;

        [JsonPropertyName("downloadUrl")]
        public string? DownloadUrl { get; set; }
    }
}
