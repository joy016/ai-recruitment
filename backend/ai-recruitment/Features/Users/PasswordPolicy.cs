namespace ai_recruitment.Features.Users
{
    // Complexity rules applied to every password a user chooses through the invitation
    // flow. Deliberately separate from IWeakPasswordChecker: this covers the structural
    // requirements, the checker covers "structurally fine but famously guessable".
    public static class PasswordPolicy
    {
        public const int MinimumLength = 8;
        public const int MaximumLength = 128;

        public const string Requirements =
            "Password must be at least 8 characters and include an uppercase letter, " +
            "a lowercase letter, a number, and a special character.";

        // Returns null when the password satisfies every rule, otherwise the message to
        // show the user. The message intentionally restates all requirements rather than
        // the single failing one, so the frontend can render one consistent hint.
        public static string? Validate(string? password)
        {
            if (string.IsNullOrWhiteSpace(password) ||
                password.Length < MinimumLength ||
                !password.Any(char.IsUpper) ||
                !password.Any(char.IsLower) ||
                !password.Any(char.IsDigit) ||
                !password.Any(IsSpecial))
            {
                return Requirements;
            }

            if (password.Length > MaximumLength)
            {
                return $"Password must not exceed {MaximumLength} characters.";
            }

            return null;
        }

        // Anything that isn't a letter, a digit, or whitespace counts as a special
        // character, which keeps the rule permissive for non-ASCII keyboards.
        private static bool IsSpecial(char c) => !char.IsLetterOrDigit(c) && !char.IsWhiteSpace(c);
    }
}
