using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.JobPosts.Dto
{
    public class JobListDto
    {

        [Key]
        public int JobId { get; set; }
        public string? JobTitle { get; set; }
        public string? Location { get; set; }
        public string? JobType { get; set; }
        public string? JobStatus { get; set; }
        public string? JobDescription { get; set; }
        public string[]? Qualifications { get; set; }
        public string[]? TechSkills { get; set; }
        public string? Department { get; set; }

        public DateTime? CreatedAt { get; set; }



    }
}
