namespace ai_recruitment.Features.Candidates.Realtime
{
    public interface ICandidateRealtimeNotifier
    {
        // Broadcasts "CandidatesChanged" { candidateId } to every connected CandidatesHub
        // client. Call only after the change has been saved. Never throws: a realtime failure
        // is logged and swallowed so it can never fail the request or background job that
        // made the change - clients still get the current state on their next fetch.
        Task NotifyCandidateChangedAsync(Guid candidateId, CancellationToken cancellationToken = default);
    }
}
