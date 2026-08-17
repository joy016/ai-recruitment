using ai_recruitment.Features.ApplicationStatuses;
using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Candidates
{
    public class Applicant
    {
        public Guid Id { get; set; }
      
        public required string EmailAddress { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string PhoneNumber { get; set; }
        public required int YearsOfExperience { get; set; }
        public string? LinkedInProfile { get; set; }
        public string? CoverLetter { get; set; }
        [Required]
        [MaxLength(255)]
        public string ResumeFileName { get; set; } = string.Empty;
        [MaxLength(500)]
        public string? ResumeFilePath { get; set; }
        [Required]
        [MaxLength(150)]
        public string Role { get; set; } = string.Empty;
        [Required]
        [MaxLength(100)]
        public string ApplicantStatus { get; set; } = "AI Screening";
        public DateTime? InterviewSched { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
      


    }
}
