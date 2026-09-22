using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Permissions.Dto
{
    public class CreatePermissionDto
    {
        [Required]
        [MaxLength(100)]
        public string PermissionName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "RoleId must be a valid role identifier.")]
        public int RoleId { get; set; }
    }
}
