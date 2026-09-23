using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Candidates.Dto
{
    public class CreateCandidateDto
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
        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        [Range(0, 50)]
        public int YearsOfExperience { get; set; }

        [MaxLength(500)]
        public string? LinkedInUrl { get; set; }
        public string? PortfolioUrl { get; set; }
        public string? SourceOfApplication { get; set; }

        public string? CoverLetter { get; set; }

        [Required]
        public IFormFile Resume { get; set; } = null!;

        [Required]
        [MaxLength(150)]
        public string Role { get; set; } = string.Empty;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "JobId must be a valid job identifier.")]
        public int JobId { get; set; }

    }
}
