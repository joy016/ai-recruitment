using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Users.Services
{
    public interface IInvitationEmailService
    {
        Task<bool> SendInvitationEmailAsync(User user, string rawToken, CancellationToken cancellationToken = default);
    }
}
