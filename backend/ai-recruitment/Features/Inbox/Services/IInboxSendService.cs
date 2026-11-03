using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    public interface IInboxSendService
    {
        Task<SendEmailResponseDto> SendAsync(SendEmailDto dto, Guid userId, string? idempotencyKey, CancellationToken cancellationToken);

        // Only valid for a message currently Status == Failed. Returns false if not found/not failed.
        Task<bool> RetryAsync(Guid messageId, CancellationToken cancellationToken);
    }
}
