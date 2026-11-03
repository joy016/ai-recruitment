namespace ai_recruitment.Features.Inbox.Dto
{
    public class InboxAttachmentDto
    {
        public Guid Id { get; set; }
        public required string Filename { get; set; }
        public required string MimeType { get; set; }
        public long Size { get; set; }

        // A freshly generated signed URL (short-lived) - never persisted, regenerated on
        // every response. See IEmailAttachmentStorage.
        public string? Url { get; set; }
    }
}
