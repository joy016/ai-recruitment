namespace ai_recruitment.Features.Candidates.Dto
{
    public class InterviewTodayListDto
    {
        public Guid CandidateId { get; set; }
        public string? CandidateName { get; set; }
        public string? PositionApplied { get; set; }
        public string? ApplicationStatus { get; set; }
        public DateTime? InterviewTime { get; set; }
        public string? Interviewer { get; set; }
    }
}
