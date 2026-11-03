namespace ai_recruitment.Features.Inbox.Model
{
    public class EmailAttachment
    {
        public Guid Id { get; set; }

        // Nullable: an attachment is uploaded via POST /api/inbox/attachments before the
        // message it belongs to exists (Compose picks files before Send), then linked once
        // the message is saved.
        public Guid? MessageId { get; set; }
        public EmailMessage? Message { get; set; }

        public required string Filename { get; set; }
        public required string MimeType { get; set; }
        public long Size { get; set; }

        // Supabase Storage object path ("bucket/path"), never a raw public URL - a fresh
        // signed URL is generated on demand (see IEmailAttachmentStorage), matching how
        // resumes are handled.
        public required string StorageUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
