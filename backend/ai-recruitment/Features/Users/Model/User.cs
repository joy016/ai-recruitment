using System.ComponentModel.DataAnnotations;
using ai_recruitment.Features.Roles.Model;

namespace ai_recruitment.Features.Users.Model
{
    public class User
    {
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;
        [Required]
        public string InsertedBy { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public DateTime? LastLoginAt { get; set; }

        // Hash of the active password-reset token, if a reset is in progress. Never the raw token.
        public string? ResetPasswordTokenHash { get; set; }

        public DateTime? ResetPasswordTokenExpiresAt { get; set; }

        // Navigation: one role -> many users
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;

        // Navigation: one user -> many refresh tokens (one per active session/device)
    }
}
