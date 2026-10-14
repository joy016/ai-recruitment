namespace ai_recruitment.Features.Roles.Dto
{
    public class RolePermissionsDto
    {
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public List<string> Permissions { get; set; } = new();
    }
}
