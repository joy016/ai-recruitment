namespace ai_recruitment.Features.Users.Dto
{
    /// <summary>Result of checking an invitation token, returned by GET /api/Users/validateInvitation.</summary>
    /// <example>{ "isValid": true, "message": "Invitation is valid.", "email": "doe.jane@company.com", "expiresAt": "2026-10-16T10:00:00Z" }</example>
    public class InvitationValidationResultDto
    {
        public bool IsValid { get; set; }

        /// <summary>Safe, generic text for the UI. Invalid results never say why.</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>Only populated when IsValid is true - no other user information is exposed, and never the token or its hash.</summary>
        public string? Email { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }
}
