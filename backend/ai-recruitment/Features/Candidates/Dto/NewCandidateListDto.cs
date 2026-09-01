namespace ai_recruitment.Features.Candidates.Dto
{
    public class NewCandidateListDto
    {
        public Guid CandidateId { get; set; }
        public string? CandidateName { get; set; }
        public string? Position { get; set; }
        public DateTime? AppliedDate { get; set; }
        public string? WorkExperience { get; set; }
        public string? ApplicationSource { get; set; }
    }
}
