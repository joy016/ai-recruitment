using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    public interface IN8nEmailWebhookService
    {
        Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            Guid messageId,
            N8nSendEmailPayload payload,
            CancellationToken cancellationToken = default);
    }
}
