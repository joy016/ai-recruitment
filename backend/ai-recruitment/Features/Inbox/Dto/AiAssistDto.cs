namespace ai_recruitment.Features.Inbox.Dto
{
    public class AiWriteRequestDto
    {
        public required string Prompt { get; set; }
        public string? Tone { get; set; }
        public string? RecipientName { get; set; }
    }

    public class AiWriteResponseDto
    {
        public string? Subject { get; set; }
        public required string BodyHtml { get; set; }
    }

    public class AiSuggestReplyRequestDto
    {
        public Guid ThreadId { get; set; }
    }

    public class AiSuggestReplyResponseDto
    {
        public List<string> Suggestions { get; set; } = [];
    }
}
