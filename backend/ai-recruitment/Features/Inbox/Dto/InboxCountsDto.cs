namespace ai_recruitment.Features.Inbox.Dto
{
    public class InboxCountsDto
    {
        public Dictionary<string, int> Folders { get; set; } = [];
        public Dictionary<string, int> Labels { get; set; } = [];
        public int TotalUnread { get; set; }
    }
}
