using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.JobPosts.Dto
{
    public class GetAllJobDto
    {
        [Key]
        public int JobId { get; set; }
        public string? JobTitle { get; set; }
        public string? JobStatus { get; set; }
        public string? Department { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int ApplicantCount { get; set; }

    }
}
