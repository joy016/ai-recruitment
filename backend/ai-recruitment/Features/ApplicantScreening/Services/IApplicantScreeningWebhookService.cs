using ai_recruitment.Features.ApplicantScreening.Model;

namespace ai_recruitment.Features.ApplicantScreening.Services
{
    // Delivers one already-built outbox row to n8n. Retrying/backoff across multiple
    // attempts is the dispatcher's job; this service only knows how to make one attempt
    // and report whether it is worth trying again.
    public interface IApplicantScreeningWebhookService
    {
        Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            ScreeningWebhookOutbox outboxEntry,
            CancellationToken cancellationToken = default);
    }
}
