using Microsoft.AspNetCore.SignalR;

namespace ai_recruitment.Features.Candidates.Realtime
{
    // Singleton wrapper over IHubContext<CandidatesHub> (itself a singleton), so it can be used
    // from scoped services and from background dispatchers alike.
    public class CandidateRealtimeNotifier : ICandidateRealtimeNotifier
    {
        private readonly IHubContext<CandidatesHub> _hubContext;
        private readonly ILogger<CandidateRealtimeNotifier> _logger;

        public CandidateRealtimeNotifier(IHubContext<CandidatesHub> hubContext, ILogger<CandidateRealtimeNotifier> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task NotifyCandidateChangedAsync(Guid candidateId, CancellationToken cancellationToken = default)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync(
                    CandidatesHub.CandidatesChangedEvent,
                    new { candidateId = candidateId.ToString() },
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // Includes OperationCanceledException: the change is already saved, so a
                // cancelled or failed broadcast must not surface to the caller.
                _logger.LogWarning(ex, "Failed to broadcast {Event} for Candidate {CandidateId}.", CandidatesHub.CandidatesChangedEvent, candidateId);
            }
        }
    }
}
