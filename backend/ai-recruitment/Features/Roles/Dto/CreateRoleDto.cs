using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Roles.Dto
{
    public class CreateRoleDto
    {
        [Required]
        [MaxLength(100)]
        public string RoleName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }
    }
}
