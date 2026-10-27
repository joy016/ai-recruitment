namespace ai_recruitment.Features.ApplicantScreening.Model
{
    // Durable outbox row written in the same request that creates a Candidate, so an
    // applicant-screening event is never lost even if n8n is unreachable at submission
    // time. ScreeningOutboxDispatcher (a BackgroundService) is the only thing that reads
    // Payload and performs the actual HTTP delivery.
    public class ScreeningWebhookOutbox
    {
        public Guid Id { get; set; }

        public Guid CandidateId { get; set; }
        public int JobId { get; set; }

        // The fully-built ApplicantScreeningWebhookPayload, already JSON-serialized at
        // write time so the dispatcher never has to re-join Candidate/Job data (which may
        // have changed since) to retry a delivery.
        public required string Payload { get; set; }

        // Pending -> Sending (claimed, in flight) -> Sent, or back to Pending to retry, or
        // -> Failed once MaxAttempts is exhausted.
        public string Status { get; set; } = "Pending";

        public int AttemptCount { get; set; }
        public string? LastError { get; set; }

        // Set when a dispatcher instance claims this row (Pending -> Sending). Lets the
        // sweep recognize and reclaim a row whose worker crashed mid-delivery instead of
        // leaving it stuck in Sending forever.
        public DateTime? ClaimedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SentAt { get; set; }

        // Backoff gate for the periodic sweep; null means "eligible now".
        public DateTime? NextAttemptAt { get; set; }
    }
}
