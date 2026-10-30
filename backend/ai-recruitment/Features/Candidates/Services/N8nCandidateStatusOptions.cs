namespace ai_recruitment.Features.Candidates.Services
{
    // Bound in Program.cs from environment variables first (the deployed shape on
    // Render), falling back to appsettings for local development. Mirrors
    // N8nScreeningOptions/N8nInvitationOptions's resolution order intentionally.
    public class N8nCandidateStatusOptions
    {
        public const string EnvWebhookUrl = "N8N_CANDIDATE_STATUS_WEBHOOK_URL";
        public const string EnvWebhookSecret = "N8N_CANDIDATE_STATUS_WEBHOOK_SECRET";

        // Where candidate.status.changed events are POSTed. Local dev points at the
        // "webhook-test" path (only live while the workflow is open in the n8n editor);
        // production points at the "webhook" path once the workflow is activated.
        public string? WebhookUrl { get; set; }

        // Sent outbound as X-Webhook-Secret so the n8n workflow can reject anything that
        // did not come from this backend.
        public string? WebhookSecret { get; set; }

        public string SecretHeaderName { get; set; } = "X-Webhook-Secret";

        public int TimeoutSeconds { get; set; } = 10;

        // Total attempts per outbox row before it is marked permanently Failed.
        public int MaxAttempts { get; set; } = 3;

        // Lets this whole feature be switched off (e.g. during an incident) without
        // redeploying - the outbox row is still written, just never dispatched.
        public bool Enabled { get; set; } = true;

        public bool AllowInsecureHttp { get; set; }
    }
}
