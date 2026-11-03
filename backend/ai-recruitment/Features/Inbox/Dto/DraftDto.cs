namespace ai_recruitment.Features.Inbox.Dto
{
    public class SaveDraftDto
    {
        public List<string> To { get; set; } = [];
        public List<string> Cc { get; set; } = [];
        public List<string> Bcc { get; set; } = [];
        public string Subject { get; set; } = string.Empty;
        public string BodyHtml { get; set; } = string.Empty;
        public List<Guid> AttachmentIds { get; set; } = [];
        public Guid? ReplyToMessageId { get; set; }
        public Guid? TemplateId { get; set; }
    }
}
