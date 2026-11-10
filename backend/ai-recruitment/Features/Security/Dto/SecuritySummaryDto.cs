namespace ai_recruitment.Features.Security.Dto
{
    /// <summary>Body for GET /api/Security/getSecuritySummary.</summary>
    /// <example>{ "lastLoginAt": "2026-09-24T01:42:00Z", "passwordChangedAt": null }</example>
    public class SecuritySummaryDto
    {
        /// <summary>
        /// The user's PREVIOUS login, not the one that produced the token making this request -
        /// read as the second-most-recent UserSessions row, not User.LastLoginAt. Null if this
        /// is the first login ever recorded for the account.
        /// </summary>
        public DateTime? LastLoginAt { get; set; }

        /// <summary>Null if the password has never been changed since the account was created/activated.</summary>
        public DateTime? PasswordChangedAt { get; set; }
    }
}
