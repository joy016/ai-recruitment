using System.Net.Http.Json;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Users.Services
{
    // Publishes "user.invitation.created" to the n8n webhook, which owns composing and
    // sending the actual email. Registered as a typed HttpClient so it participates in
    // IHttpClientFactory's handler pooling and gets a bounded timeout.
    //
    // Logging rule for this whole class: the raw token and the invitation URL that
    // contains it are never written to a log, an exception message, or the DB. Only
    // UserId / InvitationId identify a failed delivery.
    public class N8nInvitationWebhookService : IInvitationWebhookService
    {
        private readonly HttpClient _httpClient;
        private readonly N8nInvitationOptions _options;
        private readonly ILogger<N8nInvitationWebhookService> _logger;

        public N8nInvitationWebhookService(
            HttpClient httpClient,
            IOptions<N8nInvitationOptions> options,
            ILogger<N8nInvitationWebhookService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<bool> PublishInvitationCreatedAsync(
            User user,
            Guid invitationId,
            string rawToken,
            DateTime expiresAtUtc,
            CancellationToken cancellationToken = default)
        {
            if (!TryBuildRequestTargets(user.Id, invitationId, rawToken, out var webhookUri, out var invitationUrl))
            {
                return false;
            }

            var payload = new InvitationCreatedWebhookPayload
            {
                InvitationId = invitationId,
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                InvitationUrl = invitationUrl,
                ExpiresAt = expiresAtUtc,
            };

            var attempts = Math.Max(1, _options.MaxAttempts);

            for (var attempt = 1; attempt <= attempts; attempt++)
            {
                var (delivered, retryable) = await TrySendAsync(
                    webhookUri, payload, invitationId, user.Id, attempt, attempts, cancellationToken);

                if (delivered)
                {
                    return true;
                }

                if (!retryable || attempt == attempts || cancellationToken.IsCancellationRequested)
                {
                    return false;
                }

                // Short linear backoff. Deliberately bounded and in-request: the caller
                // persists the invitation before this runs, so giving up here only means
                // "resend invitation" is needed, never that the user is stranded.
                await Task.Delay(TimeSpan.FromMilliseconds(250 * attempt), cancellationToken);
            }

            return false;
        }

        private async Task<(bool Delivered, bool Retryable)> TrySendAsync(
            Uri webhookUri,
            InvitationCreatedWebhookPayload payload,
            Guid invitationId,
            Guid userId,
            int attempt,
            int attempts,
            CancellationToken cancellationToken)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, webhookUri)
                {
                    Content = JsonContent.Create(payload),
                };

                if (!string.IsNullOrWhiteSpace(_options.WebhookSecret))
                {
                    request.Headers.TryAddWithoutValidation(_options.SecretHeaderName, _options.WebhookSecret);
                }

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Published user.invitation.created to n8n for invitation {InvitationId} (user {UserId}) on attempt {Attempt}.",
                        invitationId, userId, attempt);
                    return (true, false);
                }

                // 4xx means n8n rejected the request itself (bad secret, workflow not
                // active, wrong path) - retrying the identical payload would not help.
                var retryable = (int)response.StatusCode >= 500
                    || response.StatusCode == System.Net.HttpStatusCode.RequestTimeout;

                _logger.LogWarning(
                    "n8n invitation webhook returned {StatusCode} for invitation {InvitationId} (user {UserId}), attempt {Attempt}/{Attempts}.",
                    (int)response.StatusCode, invitationId, userId, attempt, attempts);

                return (false, retryable);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                // HttpClient surfaces its own timeout as a cancellation.
                _logger.LogWarning(
                    "n8n invitation webhook timed out after {Timeout}s for invitation {InvitationId} (user {UserId}), attempt {Attempt}/{Attempts}.",
                    _options.TimeoutSeconds, invitationId, userId, attempt, attempts);
                return (false, true);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(
                    ex,
                    "n8n invitation webhook request failed for invitation {InvitationId} (user {UserId}), attempt {Attempt}/{Attempts}.",
                    invitationId, userId, attempt, attempts);
                return (false, true);
            }
        }

        // Resolves and validates both URLs up front so a configuration problem is reported
        // once, before any network call, and never as a retry loop.
        private bool TryBuildRequestTargets(
            Guid userId,
            Guid invitationId,
            string rawToken,
            out Uri webhookUri,
            out string invitationUrl)
        {
            webhookUri = null!;
            invitationUrl = string.Empty;

            if (string.IsNullOrWhiteSpace(_options.WebhookUrl))
            {
                _logger.LogError(
                    "{Key} is not configured; invitation {InvitationId} for user {UserId} was created but cannot be delivered.",
                    N8nInvitationOptions.EnvWebhookUrl, invitationId, userId);
                return false;
            }

            if (!Uri.TryCreate(_options.WebhookUrl, UriKind.Absolute, out var parsedWebhook))
            {
                _logger.LogError("{Key} is not a valid absolute URL.", N8nInvitationOptions.EnvWebhookUrl);
                return false;
            }

            if (parsedWebhook.Scheme != Uri.UriSchemeHttps && !(_options.AllowInsecureHttp && parsedWebhook.IsLoopback))
            {
                _logger.LogError(
                    "{Key} must use HTTPS (plain http is only permitted for loopback addresses in Development).",
                    N8nInvitationOptions.EnvWebhookUrl);
                return false;
            }

            if (string.IsNullOrWhiteSpace(_options.FrontendBaseUrl))
            {
                _logger.LogError(
                    "{Key} is not configured; cannot build an invitation link for user {UserId}.",
                    N8nInvitationOptions.FrontendBaseUrlConfigKey, userId);
                return false;
            }

            webhookUri = parsedWebhook;
            invitationUrl =
                $"{_options.FrontendBaseUrl.TrimEnd('/')}/set-password?token={Uri.EscapeDataString(rawToken)}";

            return true;
        }
    }
}
