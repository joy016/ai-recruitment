namespace ai_recruitment.Features.Inbox.Services
{
    public record UploadedAttachment(string StoragePath, long Size);

    // Thin wrapper over ISupabaseStorageService scoped to the email-attachment bucket, so the
    // rest of the Inbox feature never has to know the bucket name or juggle signed-URL
    // generation itself.
    public interface IEmailAttachmentStorage
    {
        Task<UploadedAttachment> UploadAsync(Guid attachmentId, string filename, string contentType, Stream content, CancellationToken cancellationToken);

        // Fresh, short-lived URL - never persisted. Used both when returning an attachment to
        // the client and when building the n8n send payload (n8n fetches from this URL).
        Task<string> GetSignedUrlAsync(string storagePath, CancellationToken cancellationToken);

        Task DeleteAsync(string storagePath, CancellationToken cancellationToken);
    }
}
