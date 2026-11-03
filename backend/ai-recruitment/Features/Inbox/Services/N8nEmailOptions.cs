namespace ai_recruitment.Features.Inbox.Services
{
    // Bound in Program.cs from environment variables first, falling back to appsettings for
    // local development - mirrors N8nCandidateStatusOptions's resolution order.
    public class N8nEmailOptions
    {
        public const string EnvWebhookUrl = "N8N_SEND_EMAIL_WEBHOOK_URL";
        public const string EnvSharedSecret = "N8N_SHARED_SECRET";
        public const string EnvAppBaseUrl = "APP_BASE_URL";

        // Where outbound send requests are POSTed. Local dev points at the "webhook-test"
        // path (only live while the workflow is open in the n8n editor); production points
        // at the "webhook" path once the workflow is activated.
        public string? WebhookUrl { get; set; }

        // Sent outbound as X-Webhook-Secret, and required inbound (on both n8n callback
        // endpoints) via the same header name - see InboxWebhooksController.
        public string? SharedSecret { get; set; }

        public string SecretHeaderName { get; set; } = "x-webhook-secret";

        // This backend's own base URL, reachable from n8n, used to build callbackUrl in the
        // outbound payload. Must be host.docker.internal-based when n8n runs in Docker.
        public string? AppBaseUrl { get; set; }

        public int TimeoutSeconds { get; set; } = 10;

        public int MaxAttempts { get; set; } = 3;

        public bool AllowInsecureHttp { get; set; }
    }
}
