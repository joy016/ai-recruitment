using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Roles.Dto
{
    public class RoleDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int UserCount { get; set; }
        public int PermissionCount { get; set; }
        public string? ChipColor { get; set; }
        public string? BackgroundColor { get; set; }
    }
}
