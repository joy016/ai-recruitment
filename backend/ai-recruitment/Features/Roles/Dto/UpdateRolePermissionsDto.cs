using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Roles.Dto
{
    public class UpdateRolePermissionsDto
    {
        // The complete desired permission set for the role - not a delta. An empty
        // list removes every permission currently assigned to the role.
        [Required]
        public List<string> Permissions { get; set; } = new();
    }
}
