namespace ai_recruitment.Features.Inbox.Dto
{
    // What this backend POSTs to N8N_SEND_EMAIL_WEBHOOK_URL. Property names are
    // camelCase on the wire (see InboxEmailWebhookService's JsonSerializerOptions) to match
    // the spec's n8n payload shape exactly.
    public class N8nSendEmailPayload
    {
        public Guid MessageId { get; set; }
        public required string SenderName { get; set; }
        public required string SenderEmail { get; set; }
        public List<string> To { get; set; } = [];
        public List<string> Cc { get; set; } = [];
        public List<string> Bcc { get; set; } = [];
        public required string Subject { get; set; }
        public required string BodyHtml { get; set; }
        public required string BodyText { get; set; }
        public List<N8nAttachmentRef> Attachments { get; set; } = [];
        public N8nReplyToRef? ReplyTo { get; set; }
        public required string CallbackUrl { get; set; }
    }

    public class N8nAttachmentRef
    {
        public required string Filename { get; set; }
        public required string MimeType { get; set; }
        public required string Url { get; set; }
    }

    public class N8nReplyToRef
    {
        public required string GmailThreadId { get; set; }
        public required string GmailMessageId { get; set; }
    }
}
