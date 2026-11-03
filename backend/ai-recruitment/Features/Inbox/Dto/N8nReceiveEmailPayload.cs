using System.Text.Json.Serialization;

namespace ai_recruitment.Features.Inbox.Dto
{
    // What this backend POSTs to N8N_RECEIVE_EMAIL_URL right after a new inbound email is
    // saved, so a downstream n8n workflow (AI classification, resume parsing, etc) can run on
    // it. Property names are snake_case on the wire per that workflow's expected shape -
    // unlike N8nSendEmailPayload (camelCase), so every property carries an explicit
    // [JsonPropertyName].
    public class N8nReceiveEmailPayload
    {
        [JsonPropertyName("message_id")]
        public Guid MessageId { get; set; }

        [JsonPropertyName("thread_id")]
        public required string ThreadId { get; set; }

        [JsonPropertyName("from")]
        public required N8nReceiveEmailFromRef From { get; set; }

        [JsonPropertyName("to")]
        public List<string> To { get; set; } = [];

        [JsonPropertyName("subject")]
        public required string Subject { get; set; }

        [JsonPropertyName("body_text")]
        public required string BodyText { get; set; }

        [JsonPropertyName("received_at")]
        public DateTime ReceivedAt { get; set; }

        [JsonPropertyName("attachments")]
        public List<N8nReceiveEmailAttachmentRef> Attachments { get; set; } = [];
    }

    public class N8nReceiveEmailFromRef
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; }

        [JsonPropertyName("email")]
        public required string Email { get; set; }
    }

    public class N8nReceiveEmailAttachmentRef
    {
        [JsonPropertyName("filename")]
        public required string Filename { get; set; }

        [JsonPropertyName("mime_type")]
        public required string MimeType { get; set; }

        [JsonPropertyName("size")]
        public long Size { get; set; }

        [JsonPropertyName("url")]
        public required string Url { get; set; }
    }
}
