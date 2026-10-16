using System.Text.Json.Serialization;

namespace ai_recruitment.Features.Users.Dto
{
    // The body POSTed to N8N_INVITATION_WEBHOOK_URL. Property names are camelCased to
    // match the contract the n8n workflow consumes.
    public class InvitationCreatedWebhookPayload
    {
        [JsonPropertyName("event")]
        public string Event { get; init; } = "user.invitation.created";

        // Stable per invitation and unchanged across delivery retries, so the n8n
        // workflow can deduplicate and avoid emailing the same link twice.
        [JsonPropertyName("invitationId")]
        public Guid InvitationId { get; init; }

        [JsonPropertyName("userId")]
        public Guid UserId { get; init; }

        [JsonPropertyName("email")]
        public string Email { get; init; } = string.Empty;

        [JsonPropertyName("firstName")]
        public string FirstName { get; init; } = string.Empty;

        [JsonPropertyName("lastName")]
        public string LastName { get; init; } = string.Empty;

        // Carries the raw token. This payload is never logged.
        [JsonPropertyName("invitationUrl")]
        public string InvitationUrl { get; init; } = string.Empty;

        [JsonPropertyName("expiresAt")]
        public DateTime ExpiresAt { get; init; }
    }
}
