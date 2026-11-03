using ai_recruitment.Service;

namespace ai_recruitment.Features.Inbox.Services
{
    public class EmailAttachmentStorage : IEmailAttachmentStorage
    {
        private readonly ISupabaseStorageService _storage;

        public EmailAttachmentStorage(ISupabaseStorageService storage)
        {
            _storage = storage;
        }

        public async Task<UploadedAttachment> UploadAsync(Guid attachmentId, string filename, string contentType, Stream content, CancellationToken cancellationToken)
        {
            var size = content.Length;
            var path = $"{attachmentId}/{filename}";

            await _storage.UploadAsync(_storage.EmailAttachmentBucket, path, content, contentType);

            return new UploadedAttachment(path, size);
        }

        public Task<string> GetSignedUrlAsync(string storagePath, CancellationToken cancellationToken)
        {
            return _storage.CreateSignedUrlAsync(_storage.EmailAttachmentBucket, storagePath, _storage.ResumeSignedUrlExpirationSeconds);
        }

        public Task DeleteAsync(string storagePath, CancellationToken cancellationToken)
        {
            return _storage.DeleteAsync(_storage.EmailAttachmentBucket, storagePath);
        }
    }
}
