namespace ai_recruitment.Features.Users
{
    public interface IWeakPasswordChecker
    {
        bool IsTooCommon(string password);
    }

    // A small, maintainable denylist of extremely common/compromised passwords. Extend this
    // list as needed, or swap the implementation for an external source (e.g. the
    // HaveIBeenPwned "Pwned Passwords" k-Anonymity API) if stronger coverage is required -
    // IWeakPasswordChecker is the seam for that.
    public class CommonPasswordChecker : IWeakPasswordChecker
    {
        private static readonly HashSet<string> Denylist = new(StringComparer.OrdinalIgnoreCase)
        {
            "password", "password1", "password123", "12345678", "123456789", "1234567890",
            "qwerty123", "qwertyuiop", "letmein123", "welcome123", "admin1234", "iloveyou1",
            "abc123456", "football1", "passw0rd", "p@ssw0rd", "changeme1", "trustno1",
            "monkey123", "dragon123", "111111111", "000000000", "123123123", "sunshine1",
            "princess1", "superman1", "qazwsx123", "zaq12wsx", "1qaz2wsx", "whatever1",
            "starwars1", "freedom123", "computer1", "internet1", "letmein1", "login1234",
        };

        public bool IsTooCommon(string password) => Denylist.Contains(password.Trim());
    }
}
