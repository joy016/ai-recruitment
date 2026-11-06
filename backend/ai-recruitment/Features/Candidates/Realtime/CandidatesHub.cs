using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ai_recruitment.Features.Candidates.Realtime
{
    // Mapped at /hubs/candidates (see Program.cs). Push-only: clients just listen for
    // "CandidatesChanged" { candidateId } and refetch through the regular, permission-checked
    // Candidates API, so no candidate data travels over this connection and no client-callable
    // methods are exposed. The JWT arrives as ?access_token=... (browsers can't set headers on
    // WebSockets) - see JwtBearerEvents.OnMessageReceived in Program.cs.
    [Authorize]
    public class CandidatesHub : Hub
    {
        public const string Path = "/hubs/candidates";
        public const string CandidatesChangedEvent = "CandidatesChanged";
    }
}
