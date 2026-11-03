namespace ai_recruitment.Features.Inbox.Dto
{
    public class N8nSendResultDto
    {
        public Guid MessageId { get; set; }
        public bool Success { get; set; }
        public string? GmailMessageId { get; set; }
        public string? GmailThreadId { get; set; }
        public DateTime? SentAt { get; set; }
        public string? Error { get; set; }
    }

    public class N8nInboundEmailDto
    {
        public required string GmailMessageId { get; set; }
        public required string GmailThreadId { get; set; }
        public string? FromName { get; set; }
        public required string FromEmail { get; set; }
        public List<string> To { get; set; } = [];
        public List<string> Cc { get; set; } = [];
        public string Subject { get; set; } = string.Empty;
        public string BodyHtml { get; set; } = string.Empty;
        public string BodyText { get; set; } = string.Empty;
        public DateTime? ReceivedAt { get; set; }
        public List<N8nInboundAttachmentDto>? Attachments { get; set; }
    }

    // n8n's Gmail Trigger node exposes attachment bytes as base64 - there is no Gmail URL this
    // backend could fetch from directly, so the workflow must base64-encode each attachment's
    // content into the callback body. See n8n/receive-email.workflow.json's Set node.
    public class N8nInboundAttachmentDto
    {
        public required string Filename { get; set; }
        public required string MimeType { get; set; }
        public required string ContentBase64 { get; set; }
    }
}
