using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Users.Dto
{
    /// <summary>Body for POST /api/Users/setInvitationPassword.</summary>
    /// <example>{ "token": "SECURE_INVITATION_TOKEN", "newPassword": "ExamplePassword123!" }</example>
    public class SetInitialPasswordDto
    {
        /// <summary>The raw token from the emailed invitation link's ?token= query parameter.</summary>
        [Required]
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// Minimum 8 characters, with at least one uppercase letter, one lowercase letter,
        /// one number, and one special character. See <see cref="PasswordPolicy"/>.
        /// </summary>
        [Required]
        [MinLength(PasswordPolicy.MinimumLength)]
        [MaxLength(PasswordPolicy.MaximumLength)]
        public string NewPassword { get; set; } = string.Empty;

        /// <summary>Optional. When supplied it must equal NewPassword.</summary>
        public string? ConfirmPassword { get; set; }
    }
}
