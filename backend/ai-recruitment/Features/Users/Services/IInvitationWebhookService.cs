using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Users.Services
{
    // Hands the invitation off to n8n, which owns the actual email delivery. The backend
    // never talks to an SMTP server itself.
    public interface IInvitationWebhookService
    {
        // Returns true only when n8n accepted the event. A false result must leave the
        // invitation row intact and retryable (see UserInvitationService).
        Task<bool> PublishInvitationCreatedAsync(
            User user,
            Guid invitationId,
            string rawToken,
            DateTime expiresAtUtc,
            CancellationToken cancellationToken = default);
    }
}
