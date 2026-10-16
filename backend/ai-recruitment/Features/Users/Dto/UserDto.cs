namespace ai_recruitment.Features.Users.Dto
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        // Independent of IsActive: true until the user completes initial password setup via
        // their invitation link, regardless of whether that invitation has since expired or
        // been revoked (a revoked/expired invitation does not mean setup was completed).
        public bool IsPendingActivation { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int RoleId { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string InsertedBy { get; set; } = string.Empty;
        public int? DepId { get; set; }
        public string? DepartmentName { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string EmployeeNumber { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
    }
}
