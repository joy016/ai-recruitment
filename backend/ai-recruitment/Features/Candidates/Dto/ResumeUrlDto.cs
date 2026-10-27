namespace ai_recruitment.Features.Candidates.Dto
{
    // Response for GET /api/Candidates/{id}/resume-url. The URL is short-lived and
    // generated per request - clients should fetch a new one rather than cache it.
    public class ResumeUrlDto
    {
        public required string Url { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? FileName { get; set; }
        public required string ContentType { get; set; }
    }
}
