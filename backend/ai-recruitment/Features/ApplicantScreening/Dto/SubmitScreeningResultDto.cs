using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.ApplicantScreening.Dto
{
    // Body n8n POSTs to /api/ApplicantScreening/results once the AI evaluation finishes
    // (or fails). The score/recommendation are advisory only - see ApplicantScreening.Model.
    public class SubmitScreeningResultDto
    {
        [Required]
        public Guid CandidateId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "JobId must be a valid job identifier.")]
        public int JobId { get; set; }

        [Required]
        [RegularExpression(
            "^(Completed|Failed|Incomplete)$",
            ErrorMessage = "ScreeningStatus must be one of: Completed, Failed, Incomplete.")]
        public string ScreeningStatus { get; set; } = string.Empty;

        [Range(0, 100)]
        public int? QualificationScore { get; set; }

        public string[]? MatchedSkills { get; set; }

        public string[]? MissingSkills { get; set; }

        [MaxLength(200)]
        public string? Recommendation { get; set; }

        [MaxLength(4000)]
        public string? Summary { get; set; }

        public DateTime? ScreenedAt { get; set; }
    }
}
