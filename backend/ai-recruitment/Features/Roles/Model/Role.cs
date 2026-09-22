using System.ComponentModel.DataAnnotations;
using ai_recruitment.Features.Permissions.Model;
using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Roles.Model
{
    public class Role
    {
        [Key]
        public int RoleId { get; set; }

        [Required]
        [MaxLength(100)]
        public string RoleName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation: one role -> many users
        public ICollection<User> Users { get; set; } = new List<User>();

        // Navigation: one role -> many permissions
        public ICollection<Permission> Permissions { get; set; } = new List<Permission>();
    }
}
