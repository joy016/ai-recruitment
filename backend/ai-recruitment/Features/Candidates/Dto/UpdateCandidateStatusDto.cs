namespace ai_recruitment.Features.Candidates.Dto
{
    public class UpdateCandidateStatusDto
    {
        public Guid Id { get; set; }
        public int ApplicantStatusId { get; set; }
        public DateTime InterviewSched { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
