using System.ComponentModel.DataAnnotations;
using ai_recruitment.Features.Roles.Model;

namespace ai_recruitment.Features.Permissions.Model
{
    public class Permission
    {
        [Key]
        public int PermissionId { get; set; }

        [Required]
        [MaxLength(100)]
        public string PermissionName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation: one role -> many permissions
        public int RoleId { get; set; }
        public Role Role { get; set; } = null!;
    }
}
