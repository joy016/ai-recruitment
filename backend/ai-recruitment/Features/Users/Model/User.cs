using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Departments.Model;
using ai_recruitment.Features.Roles.Model;
using System.ComponentModel.DataAnnotations;

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

        [Required]
        [StringLength(15)]
        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;
        public string EmployeeNumber { get; set; } = string.Empty;

        public string? ProfilePictureUrl { get; set; }

        // Null while the account is pending invitation-based activation (no usable password
        // yet); set the moment the user successfully completes "set initial password". This
        // is deliberately separate from IsActive, which remains the administrator-controlled
        // enable/disable flag.
        public DateTime? PasswordSetupCompletedAt { get; set; }

        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;

        public ICollection<Candidate> InterviewedCandidates { get; set; } = new List<Candidate>();
        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }

        public ICollection<UserInvitation> Invitations { get; set; } = new List<UserInvitation>();
    }
}
