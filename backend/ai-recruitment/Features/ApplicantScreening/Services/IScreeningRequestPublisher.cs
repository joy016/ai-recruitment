using ai_recruitment.Features.Candidates.model;

namespace ai_recruitment.Features.ApplicantScreening.Services
{
    // Builds the dynamic job+candidate payload for a just-submitted application and
    // hands it to the durable outbox. Never throws for "n8n is down" style failures -
    // those are the dispatcher's problem - only for truly unexpected errors building the
    // payload, which callers should swallow so a screening-publish failure can never fail
    // the candidate submission itself.
    public interface IScreeningRequestPublisher
    {
        Task PublishAsync(Candidate candidate, CancellationToken cancellationToken = default);
    }
}
