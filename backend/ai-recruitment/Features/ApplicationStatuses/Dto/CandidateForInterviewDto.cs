using ai_recruitment.Features.JobPosts.Model;
using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.ApplicationStatuses.Dto
{
    public class CandidateForInterviewDto
    {
        public Guid Id { get; set; }

        public required string FirstName { get; set; }
        public required string LastName { get; set; }

        public string Role { get; set; } = string.Empty;
        [Required]
        [MaxLength(100)]
        public int ApplicantStatusId { get; set; } = 1;
        public DateTime? InterviewSched { get; set; }

        //public int JobId { get; set; }
        //public Job Job { get; set; } = null!;
    }
}
