namespace ai_recruitment.Features.Inbox.Dto
{
    public class EmailTemplateDto
    {
        public Guid Id { get; set; }
        public required string Key { get; set; }
        public required string Name { get; set; }
        public required string Subject { get; set; }
        public required string BodyHtml { get; set; }
        public List<string> Variables { get; set; } = [];
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
    }
}
