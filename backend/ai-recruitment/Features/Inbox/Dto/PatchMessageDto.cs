namespace ai_recruitment.Features.Inbox.Dto
{
    public class PatchMessageDto
    {
        public bool? IsRead { get; set; }
        public bool? IsStarred { get; set; }
        public bool? IsArchived { get; set; }
        public bool? IsDeleted { get; set; }
        public List<string>? Labels { get; set; }
    }

    public class BulkMessageActionDto
    {
        public List<Guid> Ids { get; set; } = [];

        // archive | trash | markRead | markUnread | restore
        public required string Action { get; set; }
    }
}
