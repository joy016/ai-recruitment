using ai_recruitment.Features.Candidates.model;

namespace ai_recruitment.Features.Candidates.Services
{
    // Builds the candidate.status.changed payload for a just-saved status change and hands
    // it to the durable outbox. Never throws - a failure here must never fail the status
    // update request that already succeeded; callers don't need to (and shouldn't) wrap
    // this in their own try/catch.
    public interface ICandidateStatusWebhookPublisher
    {
        Task PublishAsync(
            Candidate candidate,
            string? previousStatusName,
            string newStatusName,
            string? changedBy,
            CancellationToken cancellationToken = default);
    }
}
