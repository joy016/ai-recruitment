namespace ai_recruitment.Features.Inbox.Dto
{
    public class RenderTemplateRequestDto
    {
        public string? RecipientName { get; set; }
        public Dictionary<string, string>? ExtraVars { get; set; }
    }

    public class RenderTemplateResponseDto
    {
        public required string Subject { get; set; }
        public required string BodyHtml { get; set; }
    }
}
