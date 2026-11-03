using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Inbox.Dto
{
    public class SendEmailDto
    {
        public List<string> To { get; set; } = [];
        public List<string> Cc { get; set; } = [];
        public List<string> Bcc { get; set; } = [];

        public string Subject { get; set; } = string.Empty;
        public string BodyHtml { get; set; } = string.Empty;

        public List<Guid> AttachmentIds { get; set; } = [];

        // new | reply | reply_all | forward
        [Required]
        public required string Mode { get; set; }

        public Guid? ReplyToMessageId { get; set; }
        public Guid? DraftId { get; set; }
        public Guid? TemplateId { get; set; }
    }

    public class SendEmailResponseDto
    {
        public Guid MessageId { get; set; }
        public required string Status { get; set; }
    }
}
