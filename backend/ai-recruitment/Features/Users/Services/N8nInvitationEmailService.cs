using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Users.Services
{
    // Reuses the same "post to an n8n webhook, let the workflow handle the actual email
    // send" integration already used for the candidate-application-submitted notification
    // (see CandidatesController), rather than introducing a new SMTP/email SDK dependency.
    public class N8nInvitationEmailService : IInvitationEmailService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<N8nInvitationEmailService> _logger;

        public N8nInvitationEmailService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<N8nInvitationEmailService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendInvitationEmailAsync(User user, string rawToken, CancellationToken cancellationToken = default)
        {
            var webhookUrl = _configuration["N8n:UserInvitationWebhookUrl"];
            if (string.IsNullOrWhiteSpace(webhookUrl))
            {
                _logger.LogWarning(
                    "N8n:UserInvitationWebhookUrl is not configured; skipping invitation email for user {UserId}.",
                    user.Id);
                return false;
            }

            var frontendBaseUrl = _configuration["Frontend:BaseUrl"];
            if (string.IsNullOrWhiteSpace(frontendBaseUrl))
            {
                _logger.LogError(
                    "Frontend:BaseUrl is not configured; cannot build an invitation link for user {UserId}.",
                    user.Id);
                return false;
            }

            // The raw token only ever appears in this URL, sent once to the email-delivery
            // webhook. It is never logged and never returned from any API response.
            var activationUrl = $"{frontendBaseUrl.TrimEnd('/')}/set-password?token={Uri.EscapeDataString(rawToken)}";

            var payload = new
            {
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                portalName = "AI Recruitment Hub",
                activationUrl,
                expiresInHours = 24,
            };

            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                var response = await httpClient.PostAsJsonAsync(webhookUrl, payload, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning(
                        "Invitation email webhook returned {StatusCode} for user {UserId}. Response body: {Body}",
                        response.StatusCode, user.Id, body);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invitation email for user {UserId} via {WebhookUrl}.", user.Id, webhookUrl);
                return false;
            }
        }
    }
}
