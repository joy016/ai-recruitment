using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Users
{
    public interface IUserInvitationService
    {
        // Invalidates any still-usable prior invitations for the user, creates a fresh one,
        // persists it, and attempts to email it. Returns whether the email was actually
        // delivered; the invitation row itself is always created regardless, so a delivery
        // failure is always retryable via ResendInvitationAsync rather than leaving the user
        // stuck with no way in.
        Task<bool> IssueInvitationAsync(User user, CancellationToken cancellationToken = default);

        Task<InvitationValidationResultDto> ValidateInvitationAsync(string token);

        Task<SetInitialPasswordResult> SetInitialPasswordAsync(SetInitialPasswordDto dto);

        Task<ResendInvitationResult> ResendInvitationAsync(Guid userId);
    }
}
