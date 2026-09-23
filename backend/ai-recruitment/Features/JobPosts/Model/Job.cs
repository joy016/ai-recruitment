using ai_recruitment.Features.Candidates.model;
using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.JobPosts.Model
{
    public class Job
    {
        [Key]
        public int JobId { get; set; }
        public required string JobTitle { get; set; }
        public required string Location { get; set; }
        public required string JobType { get; set; }
        public required string JobStatus { get; set; }
        public required string JobDescription { get; set; }
        public required string Department { get; set; }
        public required string[] Qualifications { get; set; }
        public required string[] TechSkills { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property: one job -> many applications
        public ICollection<Candidate> Candidates { get; set; } = new List<Candidate>();
    }
}
