using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    // Both methods only ever return text - neither one sends anything, and neither one is
    // handed attachments or more thread context than the few most recent messages it needs.
    public interface IEmailAiService
    {
        Task<AiWriteResponseDto> WriteAsync(string prompt, string? tone, string? recipientName, CancellationToken cancellationToken);

        Task<List<string>> SuggestReplyAsync(IReadOnlyList<(string FromName, string BodyText)> recentMessages, CancellationToken cancellationToken);
    }
}
