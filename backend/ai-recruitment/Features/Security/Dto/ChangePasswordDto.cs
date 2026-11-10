using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Security.Dto
{
    /// <summary>Body for POST /api/Security/changePassword. Acts on the current user only.</summary>
    /// <example>{ "currentPassword": "OldPassw0rd!", "newPassword": "NewPassw0rd!", "confirmNewPassword": "NewPassw0rd!" }</example>
    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        /// <summary>Must satisfy Users.PasswordPolicy and differ from CurrentPassword.</summary>
        [Required]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
