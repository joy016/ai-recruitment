using ai_recruitment.Features.Inbox.Dto;
using Microsoft.AspNetCore.Http;

namespace ai_recruitment.Features.Inbox.Services
{
    public class InboxOperationException : Exception
    {
        public InboxOperationException(string message) : base(message) { }
    }

    public interface IInboxMutationService
    {
        Task<bool> PatchMessageAsync(Guid id, PatchMessageDto dto, CancellationToken cancellationToken);

        Task<int> BulkActionAsync(BulkMessageActionDto dto, CancellationToken cancellationToken);

        // Only allowed from Trash (IsDeleted == true) - see InboxController.
        Task<bool> PermanentDeleteAsync(Guid id, CancellationToken cancellationToken);

        Task<EmailMessageDto> SaveDraftAsync(Guid? draftId, SaveDraftDto dto, Guid userId, CancellationToken cancellationToken);

        Task<bool> DiscardDraftAsync(Guid draftId, CancellationToken cancellationToken);

        Task<InboxAttachmentDto> UploadAttachmentAsync(IFormFile file, CancellationToken cancellationToken);
    }
}
