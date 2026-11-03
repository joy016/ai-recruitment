namespace ai_recruitment.Features.Inbox.Dto
{
    // Read-only snapshot of a Candidate for the Inbox's sender/recipient card. Never written
    // to - see IInboxQueryService.TryBuildCandidateCardAsync, the only place that produces one.
    public class CandidateCardDto
    {
        public Guid Id { get; set; }
        public required string FullName { get; set; }
        public string? JobAppliedFor { get; set; }
        public int YearsOfExperience { get; set; }
        public required string Status { get; set; }
        public DateTime? InterviewSchedule { get; set; }
    }
}
