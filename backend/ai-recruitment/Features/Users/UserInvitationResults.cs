using ai_recruitment.Features.Users.Dto;

namespace ai_recruitment.Features.Users
{
    public enum CreateUserOutcome
    {
        Success,
        EmailAlreadyExists,
        RoleNotFound,
    }

    public class CreateUserResult
    {
        public CreateUserOutcome Outcome { get; init; }
        public string? Message { get; init; }
        public UserDto? User { get; init; }
        public bool InvitationEmailSent { get; init; }

        public bool Succeeded => Outcome == CreateUserOutcome.Success;
    }

    public enum SetInitialPasswordOutcome
    {
        Success,
        InvalidOrExpiredToken,
        PasswordMismatch,

        // Fails the structural rules in PasswordPolicy (length / character classes).
        PasswordRequirementsNotMet,

        // Structurally valid but on the common-password denylist.
        WeakPassword,
    }

    public class SetInitialPasswordResult
    {
        public SetInitialPasswordOutcome Outcome { get; init; }
        public string Message { get; init; } = string.Empty;

        public bool Succeeded => Outcome == SetInitialPasswordOutcome.Success;
    }

    public enum ResendInvitationOutcome
    {
        Success,
        UserNotFound,
        UserNotPendingActivation,
    }

    public class ResendInvitationResult
    {
        public ResendInvitationOutcome Outcome { get; init; }
        public string Message { get; init; } = string.Empty;
        public bool InvitationEmailSent { get; init; }

        public bool Succeeded => Outcome == ResendInvitationOutcome.Success;
    }
}
