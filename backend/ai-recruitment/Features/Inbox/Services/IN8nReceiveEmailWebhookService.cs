using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    public interface IN8nReceiveEmailWebhookService
    {
        Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            Guid messageId,
            N8nReceiveEmailPayload payload,
            CancellationToken cancellationToken = default);
    }
}
