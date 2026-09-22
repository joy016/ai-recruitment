using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Users.Dto
{
    public class UpdateUserDto
    {
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "RoleId must be a valid role identifier.")]
        public int RoleId { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
