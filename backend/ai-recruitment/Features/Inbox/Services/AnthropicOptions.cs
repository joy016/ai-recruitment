namespace ai_recruitment.Features.Inbox.Services
{
    public class AnthropicOptions
    {
        public const string EnvApiKey = "ANTHROPIC_API_KEY";

        // Left empty => AnthropicEmailAiService falls back to deterministic templated text
        // instead of calling out, so the AI buttons never hard-fail in an environment with
        // no key configured.
        public string? ApiKey { get; set; }

        public string Model { get; set; } = "claude-sonnet-5";
    }
}
