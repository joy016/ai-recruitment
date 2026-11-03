namespace ai_recruitment.Features.Inbox.Dto
{
    // One row of GET /api/inbox/messages - a conversation summary, not a single message.
    public class InboxThreadListItemDto
    {
        public required string ThreadId { get; set; }
        public required string Subject { get; set; }
        public required string SenderName { get; set; }
        public required string SenderEmail { get; set; }

        // Plain-text preview of the latest message's body (first ~160 chars).
        public required string Preview { get; set; }

        public int MessageCount { get; set; }
        public int UnreadCount { get; set; }
        public bool IsStarred { get; set; }
        public bool HasAttachments { get; set; }
        public List<string> Labels { get; set; } = [];
        public DateTime LastActivityAt { get; set; }
        public CandidateCardDto? Candidate { get; set; }
    }

    public class InboxThreadListResponseDto
    {
        public List<InboxThreadListItemDto> Items { get; set; } = [];
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
