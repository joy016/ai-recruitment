using ai_recruitment.Features.Candidates.model;

namespace ai_recruitment.Features.Candidates.Services
{
    // Owns a single HTTP delivery attempt for one outbox row. Never throws for ordinary
    // delivery failures (network error, 4xx/5xx, timeout) - those come back as
    // (false, retryable, error) for CandidateStatusOutboxDispatcher to act on.
    public interface IN8nCandidateStatusWebhookService
    {
        Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            CandidateStatusWebhookOutbox outboxEntry,
            CancellationToken cancellationToken = default);
    }
}
