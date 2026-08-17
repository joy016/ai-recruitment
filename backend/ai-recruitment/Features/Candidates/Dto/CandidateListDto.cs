namespace ai_recruitment.Features.Candidates.Dto
{
    public class CandidateListDto
    {
        public Guid Id { get; set; }
        public string? EmailAddress { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public DateTime ApplicationDate { get; set; }

        public string?  YearsOfExperience { get; set; }
        public DateTime? InterviewSched { get; set; }
        public required int ApplicantStatusId { get; set; }
        public string? ResumePath { get; set; }

    }
}
