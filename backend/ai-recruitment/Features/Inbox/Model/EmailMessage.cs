using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Inbox.Model
{
    // A single email (one side of a conversation). Threads are not their own table -
    // a conversation is just every EmailMessage sharing the same GmailThreadId (preferred)
    // or, before a Gmail id exists yet (e.g. a draft), the same ThreadId.
    public class EmailMessage
    {
        public Guid Id { get; set; }

        // Generated at creation time (new conversation) or copied from the first message
        // of the thread being replied to. GmailThreadId is the source of truth once n8n
        // assigns one; ThreadId lets drafts/queued-but-not-yet-sent messages still group.
        public Guid ThreadId { get; set; }
        public string? GmailMessageId { get; set; }
        public string? GmailThreadId { get; set; }

        // Set when this outbound message is a reply/reply-all to a message that itself has a
        // GmailMessageId (inbound, or a previously sent outbound message) - carried through to
        // InboxSendDispatcher so it can build the n8n payload's replyTo without re-looking up
        // the original message. Null means "send as a new Gmail message".
        public string? InReplyToGmailMessageId { get; set; }

        public EmailDirection Direction { get; set; }

        public required string FromName { get; set; }
        public required string FromEmail { get; set; }

        public List<string> ToEmails { get; set; } = [];
        public List<string> CcEmails { get; set; } = [];
        public List<string> BccEmails { get; set; } = [];

        public required string Subject { get; set; }
        public string BodyHtml { get; set; } = string.Empty;
        public string BodyText { get; set; } = string.Empty;

        public EmailStatus Status { get; set; } = EmailStatus.Draft;
        public string? ErrorMessage { get; set; }

        public Guid? SentByUserId { get; set; }
        public User? SentByUser { get; set; }

        // Informational only - which template (if any) this message started from. Never
        // used to decide behavior; editing the body after choosing a template is normal.
        public Guid? TemplateId { get; set; }

        public bool IsRead { get; set; }
        public bool IsStarred { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDeleted { get; set; }

        public List<string> Labels { get; set; } = [];

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? ReceivedAt { get; set; }

        public List<EmailAttachment> Attachments { get; set; } = [];

        // --- Outbox/dispatcher bookkeeping (not part of the public API shape) ---
        // Mirrors CandidateStatusWebhookOutbox's claim/backoff fields, inlined onto the
        // message itself instead of a separate outbox table since EmailMessage.Status
        // already models Draft/Sending/Sent/Failed.
        public int AttemptCount { get; set; }
        public DateTime? NextAttemptAt { get; set; }
        public DateTime? ClaimedAt { get; set; }

        // De-dupes a double-click of Send. Null for every message that isn't the result
        // of a POST /api/inbox/send call (drafts created via the Compose autosave, inbound
        // messages, etc). Unique together with SentByUserId - see AppDbContext.
        public string? IdempotencyKey { get; set; }

        // --- Inbound -> n8n notification bookkeeping (InboxReceiveNotifyDispatcher) ---
        // Set once n8n has accepted the inbound-email notification; null means "not notified
        // yet" (the dispatcher's dedupe guard - see N8nNotifiedAt == null in its queries).
        // AttemptCount/NextAttemptAt/ClaimedAt above are reused for this flow too: a message
        // is always either Direction=Outbound (send flow) or Direction=Inbound (this flow),
        // so the two dispatchers never contend over the same row.
        public DateTime? N8nNotifiedAt { get; set; }

        // Set after MaxAttempts delivery attempts are exhausted, so the message can be found
        // and retried later without needing a dedicated outbox table.
        public bool N8nSyncFailed { get; set; }
    }
}
