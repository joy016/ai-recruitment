namespace ai_recruitment.Features.ApplicantScreening.Services
{
    // Bound in Program.cs from environment variables first (the deployed shape on
    // Render), falling back to appsettings for local development. Mirrors
    // N8nInvitationOptions's resolution order intentionally.
    public class N8nScreeningOptions
    {
        public const string EnvWebhookUrl = "N8N_SCREENING_WEBHOOK_URL";
        public const string EnvWebhookSecret = "N8N_SCREENING_WEBHOOK_SECRET";
        public const string EnvCallbackSecret = "N8N_SCREENING_CALLBACK_SECRET";

        // Where candidate + job data is POSTed. Production path is ".../webhook/applicant-screening";
        // the test path is ".../webhook-test/applicant-screening" (only live while the
        // workflow is open in the n8n editor).
        public string? WebhookUrl { get; set; }

        // Sent outbound as X-Webhook-Secret so the n8n workflow can reject anything that
        // did not come from this backend.
        public string? WebhookSecret { get; set; }

        public string SecretHeaderName { get; set; } = "X-Webhook-Secret";

        // Required inbound on POST /api/ApplicantScreening/results - a separate secret
        // from WebhookSecret so compromising one direction doesn't compromise the other.
        public string? CallbackSecret { get; set; }

        public int TimeoutSeconds { get; set; } = 15;

        // Total attempts per outbox row before it is marked permanently Failed.
        public int MaxAttempts { get; set; } = 5;

        public bool AllowInsecureHttp { get; set; }

        // How long a signed resume link stays valid for n8n to fetch the file.
        public int ResumeLinkExpirationMinutes { get; set; } = 30;
    }
}
