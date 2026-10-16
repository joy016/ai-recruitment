namespace ai_recruitment.Features.Users.Services
{
    // Bound in Program.cs from environment variables first (the deployed shape on
    // Render), falling back to the appsettings sections used for local development.
    // Nothing here has a hardcoded default: a missing value disables delivery and is
    // reported as a failed send rather than silently inventing a URL.
    public class N8nInvitationOptions
    {
        public const string EnvWebhookUrl = "N8N_INVITATION_WEBHOOK_URL";
        public const string EnvWebhookSecret = "N8N_WEBHOOK_SECRET";

        // Config key bound from "Frontend:BaseUrl", which ASP.NET Core's environment
        // variable provider populates from Frontend__BaseUrl (set on Render in
        // production) and which falls back to appsettings.Development.json's
        // http://localhost:3000 locally. Used only for log messages below.
        public const string FrontendBaseUrlConfigKey = "Frontend:BaseUrl";

        public string? WebhookUrl { get; set; }

        // Sent to n8n as a shared secret so the workflow can reject anything that didn't
        // come from this backend. Compare it inside the n8n workflow before acting.
        public string? WebhookSecret { get; set; }

        public string SecretHeaderName { get; set; } = "X-Webhook-Secret";

        // Base of the Next.js app; the invitation link is "{FrontendBaseUrl}/set-password?token=...".
        public string? FrontendBaseUrl { get; set; }

        public int TimeoutSeconds { get; set; } = 10;

        // Total attempts per invitation (1 = no retry). Each retry re-sends the same
        // payload, including the same InvitationId, so n8n can deduplicate.
        public int MaxAttempts { get; set; } = 3;

        // Plain http is refused outside Development so a misconfigured environment can
        // never put a live invitation token on the wire unencrypted.
        public bool AllowInsecureHttp { get; set; }
    }
}
