namespace ai_recruitment.Features.Inbox.Model
{
    // Append-only delivery/lifecycle trail for one EmailMessage - e.g. "queued", "send_attempt",
    // "send_failed", "sent", "retry_requested", "received". Deliberately excludes bodies and
    // secrets (see Payload) so this table can be inspected/exported without a confidentiality
    // concern.
    public class EmailAuditLog
    {
        public Guid Id { get; set; }

        public Guid MessageId { get; set; }

        public required string Event { get; set; }

        // Small JSON blob of non-sensitive context (e.g. { "attempt": 2, "statusCode": 503 }).
        // Never the email body/subject or the webhook secret.
        public string? Payload { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
