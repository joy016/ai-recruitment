using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Inbox.Dto
{
    public class CreateEmailTemplateDto
    {
        [Required, MaxLength(100)]
        public required string Key { get; set; }

        [Required, MaxLength(150)]
        public required string Name { get; set; }

        [Required, MaxLength(250)]
        public required string Subject { get; set; }

        public string BodyHtml { get; set; } = string.Empty;

        public List<string>? Variables { get; set; }

        public int SortOrder { get; set; }
    }
}
