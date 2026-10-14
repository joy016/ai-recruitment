namespace ai_recruitment.Features.Me.Dto
{
    public class MyPermissionsDto
    {
        public string Role { get; set; } = string.Empty;
        public List<string> Permissions { get; set; } = new();
    }
}
