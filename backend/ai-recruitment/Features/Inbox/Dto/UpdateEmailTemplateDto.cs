using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Inbox.Dto
{
    public class UpdateEmailTemplateDto
    {
        [MaxLength(150)]
        public string? Name { get; set; }

        [MaxLength(250)]
        public string? Subject { get; set; }

        public string? BodyHtml { get; set; }
        public List<string>? Variables { get; set; }
        public int? SortOrder { get; set; }
        public bool? IsActive { get; set; }
    }
}
