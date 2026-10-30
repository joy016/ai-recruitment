namespace ai_recruitment.Features.Candidates.model
{
    // Durable outbox row written in the same request that saves a candidate's new status,
    // so a "status changed" email event is never lost even if n8n is unreachable at that
    // moment. The status update itself is already committed by the time this is written -
    // writing this row (or failing to) never affects that save. CandidateStatusOutboxDispatcher
    // (a BackgroundService) is the only thing that reads Payload and performs the actual
    // HTTP delivery. Doubles as the delivery log HR can use to see whether a status-change
    // email made it to n8n (Status/AttemptCount/LastError/SentAt), so no separate log table
    // was added for that.
    public class CandidateStatusWebhookOutbox
    {
        public Guid Id { get; set; }

        public Guid CandidateId { get; set; }
        public int JobId { get; set; }

        // Denormalized out of Payload so a log line or a query against this table never
        // needs to parse JSON to answer "what status/email was this for".
        public string? PreviousStatus { get; set; }
        public required string NewStatus { get; set; }
        public required string EmailType { get; set; }

        // The fully-built CandidateStatusChangedWebhookPayload, already JSON-serialized at
        // write time so the dispatcher never has to re-join Candidate/Job/status data
        // (which may have changed again since) to retry a delivery.
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
