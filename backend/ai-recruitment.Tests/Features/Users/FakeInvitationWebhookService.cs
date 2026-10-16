using ai_recruitment.Features.Users.Model;
using ai_recruitment.Features.Users.Services;

namespace ai_recruitment.Tests.Features.Users
{
    // Records every call instead of actually reaching n8n, and lets each test choose
    // whether the webhook "accepts" the event.
    public class FakeInvitationWebhookService : IInvitationWebhookService
    {
        public bool ShouldSucceed { get; set; } = true;

        public List<(User User, Guid InvitationId, string RawToken, DateTime ExpiresAt)> Calls { get; } = new();

        public Task<bool> PublishInvitationCreatedAsync(
            User user,
            Guid invitationId,
            string rawToken,
            DateTime expiresAtUtc,
            CancellationToken cancellationToken = default)
        {
            Calls.Add((user, invitationId, rawToken, expiresAtUtc));
            return Task.FromResult(ShouldSucceed);
        }
    }
}
