namespace ai_recruitment.Features.Notifications.Dto
{
    public class NotificationDto
    {
        public Guid Id { get; set; }
        public required string Type { get; set; }
        public required string Category { get; set; }
        public required string Severity { get; set; }
        public required string Title { get; set; }
        public required string Message { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid? CandidateId { get; set; }
        public int? JobId { get; set; }
        public int? InterviewId { get; set; }
    }
}
