namespace ai_recruitment.Features.Inbox.Services
{
    // Bound in Program.cs from environment variables first, falling back to appsettings for
    // local development - mirrors N8nEmailOptions's resolution order. This is a separate
    // feature from N8nEmailOptions: that one hands outbound replies to n8n and authenticates
    // n8n's callbacks; this one notifies n8n right after a new inbound email is saved so a
    // downstream workflow (AI classification, resume parsing, etc) can run on it.
    public class N8nReceiveEmailOptions
    {
        public const string EnvWebhookUrl = "N8N_RECEIVE_EMAIL_URL";
        public const string EnvWebhookSecret = "N8N_WEBHOOK_SECRET";

        // Use the "webhook-test" path while the workflow is open in the n8n editor; switch to
        // the "webhook" path once it's saved and Active - nothing else needs to change.
        public string? WebhookUrl { get; set; }

        public string? WebhookSecret { get; set; }

        public string SecretHeaderName { get; set; } = "X-Webhook-Secret";

        public int TimeoutSeconds { get; set; } = 5;

        public int MaxAttempts { get; set; } = 3;

        public bool AllowInsecureHttp { get; set; }
    }
}
