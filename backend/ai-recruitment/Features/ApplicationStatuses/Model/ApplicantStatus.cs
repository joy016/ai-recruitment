using ai_recruitment.Features.Candidates.model;
using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.ApplicationStatuses.Model
{
    public class ApplicantStatus
    {
        [Key]
        public int StatusId { get; set; }
        public required string StatusName { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        //public ICollection<Applicant> Applicants { get; set; } = new List<Applicant>();

    }
}
