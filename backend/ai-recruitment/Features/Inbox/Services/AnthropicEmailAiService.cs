using Anthropic;
using Anthropic.Models.Messages;
using ai_recruitment.Features.Inbox.Dto;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Inbox.Services
{
    // Backs the two "sparkle button" endpoints (write / suggest-reply) with Claude via the
    // official Anthropic C# SDK, already referenced by this project. Falls back to
    // deterministic templated text when no API key is configured, so these endpoints never
    // hard-fail in an environment without one. Never logs a prompt, a suggestion, or any
    // thread content - only pass/fail + counts.
    public class AnthropicEmailAiService : IEmailAiService
    {
        private readonly AnthropicOptions _options;
        private readonly ILogger<AnthropicEmailAiService> _logger;

        public AnthropicEmailAiService(IOptions<AnthropicOptions> options, ILogger<AnthropicEmailAiService> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task<AiWriteResponseDto> WriteAsync(string prompt, string? tone, string? recipientName, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(_options.ApiKey))
            {
                return FallbackWrite(prompt, recipientName);
            }

            var greetingName = string.IsNullOrWhiteSpace(recipientName) ? "there" : recipientName.Trim();
            var toneInstruction = string.IsNullOrWhiteSpace(tone) ? "professional and warm" : tone.Trim();

            var systemPrompt =
                "You draft short HR recruitment emails for a hiring team. Write only the email body as simple HTML "
                + "using just <p>, <br>, <ul> and <li> tags - no markdown, no <html>/<body> wrapper, no subject line. "
                + $"Tone: {toneInstruction}. Greet the recipient as \"{greetingName}\". Sign off as \"HR Recruitment Team\".";

            try
            {
                var client = new AnthropicClient { ApiKey = _options.ApiKey };

                var message = await client.Messages.Create(new MessageCreateParams
                {
                    Model = _options.Model,
                    MaxTokens = 600,
                    System = systemPrompt,
                    Messages = [new MessageParam { Role = Role.User, Content = prompt }],
                }, cancellationToken);

                var text = ExtractText(message);
                if (string.IsNullOrWhiteSpace(text))
                {
                    _logger.LogWarning("Anthropic returned no text content for an email-write request; using fallback.");
                    return FallbackWrite(prompt, recipientName);
                }

                return new AiWriteResponseDto { BodyHtml = text };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Anthropic email-write request failed; using fallback.");
                return FallbackWrite(prompt, recipientName);
            }
        }

        public async Task<List<string>> SuggestReplyAsync(IReadOnlyList<(string FromName, string BodyText)> recentMessages, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(_options.ApiKey) || recentMessages.Count == 0)
            {
                return FallbackSuggestions(recentMessages);
            }

            var systemPrompt =
                "You suggest 2 short HR reply drafts for the most recent message in an email thread. Reply with only the "
                + "email bodies as simple HTML using just <p>, <br>, <ul> and <li> tags, each suggestion separated by a "
                + "line containing exactly ---. No subject line, no preamble, no markdown.";

            var threadSummary = string.Join(
                "\n\n",
                recentMessages.TakeLast(5).Select(m => $"{m.FromName}: {m.BodyText}"));

            try
            {
                var client = new AnthropicClient { ApiKey = _options.ApiKey };

                var message = await client.Messages.Create(new MessageCreateParams
                {
                    Model = _options.Model,
                    MaxTokens = 800,
                    System = systemPrompt,
                    Messages = [new MessageParam { Role = Role.User, Content = threadSummary }],
                }, cancellationToken);

                var text = ExtractText(message);
                var suggestions = text
                    .Split("---", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(s => s.Length > 0)
                    .ToList();

                return suggestions.Count > 0 ? suggestions : FallbackSuggestions(recentMessages);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Anthropic suggest-reply request failed; using fallback.");
                return FallbackSuggestions(recentMessages);
            }
        }

        private static string ExtractText(Message message)
        {
            var builder = new System.Text.StringBuilder();
            foreach (var block in message.Content)
            {
                if (block.TryPickText(out var textBlock))
                {
                    builder.Append(textBlock.Text);
                }
            }
            return builder.ToString();
        }

        private static AiWriteResponseDto FallbackWrite(string prompt, string? recipientName)
        {
            var greetingName = string.IsNullOrWhiteSpace(recipientName) ? "there" : recipientName.Trim();
            var body = $"<p>Hi {greetingName},</p><p>{System.Net.WebUtility.HtmlEncode(prompt)}</p><p>Best regards,<br>HR Recruitment Team</p>";
            return new AiWriteResponseDto { BodyHtml = body };
        }

        private static List<string> FallbackSuggestions(IReadOnlyList<(string FromName, string BodyText)> recentMessages)
        {
            var name = recentMessages.Count > 0 ? recentMessages[^1].FromName.Split(' ').FirstOrDefault() : null;
            var greetingName = string.IsNullOrWhiteSpace(name) ? "there" : name;

            return
            [
                $"<p>Hi {greetingName},</p><p>Thank you for getting back to us. I've noted your message and will coordinate with the hiring team, then follow up with the confirmed details shortly.</p><p>Best regards,<br>HR Recruitment Team</p>",
                $"<p>Hi {greetingName},</p><p>Thanks for the update - I'll review this and get back to you within the day.</p><p>Best regards,<br>HR Recruitment Team</p>",
            ];
        }
    }
}
