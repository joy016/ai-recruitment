using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.JobPosts.Model;

namespace ai_recruitment.Features.ApplicantScreening.Model
{
    // AI screening is advisory only. Nothing in this entity (or the callback that writes
    // it) ever changes Candidate.ApplicantStatusId - final decisions stay with HR.
    public class ApplicantScreening
    {
        public Guid Id { get; set; }

        public Guid CandidateId { get; set; }
        public Candidate Candidate { get; set; } = null!;

        public int JobId { get; set; }
        public Job Job { get; set; } = null!;

        // 0-100, advisory AI match score. Null while a screening is still pending/failed.
        public int? QualificationScore { get; set; }

        public string[] MatchedSkills { get; set; } = [];
        public string[] MissingSkills { get; set; } = [];

        public string? Recommendation { get; set; }
        public string? Summary { get; set; }

        // "Completed" | "Failed" | "Incomplete" - whatever n8n reports back.
        public required string ScreeningStatus { get; set; }

        public DateTime? ScreenedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
