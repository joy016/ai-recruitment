namespace ai_recruitment.Features.Inbox.Dto
{
    // A single message inside a thread (GET /api/inbox/threads/:threadId).
    public class EmailMessageDto
    {
        public Guid Id { get; set; }
        public required string Direction { get; set; }
        public required string FromName { get; set; }
        public required string FromEmail { get; set; }
        public List<string> ToEmails { get; set; } = [];
        public List<string> CcEmails { get; set; } = [];
        public List<string> BccEmails { get; set; } = [];
        public required string Subject { get; set; }
        public required string BodyHtml { get; set; }
        public required string BodyText { get; set; }
        public required string Status { get; set; }
        public string? ErrorMessage { get; set; }
        public bool IsRead { get; set; }
        public bool IsStarred { get; set; }
        public List<InboxAttachmentDto> Attachments { get; set; } = [];
        public DateTime CreatedAt { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
    }

    public class InboxThreadDto
    {
        public required string ThreadId { get; set; }
        public required string Subject { get; set; }
        public List<string> Labels { get; set; } = [];
        public List<EmailMessageDto> Messages { get; set; } = [];
        public CandidateCardDto? Candidate { get; set; }
    }
}
