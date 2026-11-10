namespace ai_recruitment.Features.Security
{
    public enum ChangePasswordOutcome
    {
        Success,
        WrongCurrentPassword,
        Mismatch,

        // Fails the structural rules in Users.PasswordPolicy, or is on the common-password
        // denylist (Users.IWeakPasswordChecker) - both surface under the same outcome since
        // either way the field and the user-facing fix ("choose a different password") match.
        WeakPassword,
        SameAsCurrent,
    }

    public class ChangePasswordResult
    {
        public ChangePasswordOutcome Outcome { get; init; }
        public string Message { get; init; } = string.Empty;

        // Which request field the message applies to, so the frontend can show it under the
        // right input (e.g. "currentPassword"). Null only for Success.
        public string? Field { get; init; }

        public int OtherSessionsSignedOut { get; init; }

        public bool Succeeded => Outcome == ChangePasswordOutcome.Success;

        public static ChangePasswordResult Fail(ChangePasswordOutcome outcome, string field, string message) =>
            new() { Outcome = outcome, Field = field, Message = message };

        public static ChangePasswordResult Success(int otherSessionsSignedOut) => new()
        {
            Outcome = ChangePasswordOutcome.Success,
            Message = "Password updated.",
            OtherSessionsSignedOut = otherSessionsSignedOut,
        };
    }
}
