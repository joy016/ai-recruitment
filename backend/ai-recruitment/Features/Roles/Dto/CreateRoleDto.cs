using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Roles.Dto
{
    /// <summary>Body for POST /api/Roles/insertRole and PUT /api/Roles/editRole/{roleId}.</summary>
    /// <example>{ "roleName": "Talent Sourcer", "description": "Sources candidates for open roles", "chipColor": "#2E86C1" }</example>
    public class CreateRoleDto
    {
        [Required]
        [MaxLength(100)]
        public string RoleName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        /// <summary>
        /// A "#RRGGBB" hex color for the role's chip. On create, a missing or empty value
        /// falls back to <see cref="Roles.RoleColorDefaults.DefaultChipColor"/>; on edit, a
        /// missing or empty value leaves the role's current color unchanged.
        /// </summary>
        public string? ChipColor { get; set; }
    }
}
