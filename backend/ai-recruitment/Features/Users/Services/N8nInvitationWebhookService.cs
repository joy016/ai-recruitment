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

            // Scheme + host + path only - never the query string - so nothing sensitive
            // ever reaches this log line even if a future change adds one.
            var sanitizedDestination = webhookUri.GetLeftPart(UriPartial.Path);

            for (var attempt = 1; attempt <= attempts; attempt++)
            {
                _logger.LogInformation(
                    "Sending invitation webhook to {WebhookDestination} for invitation {InvitationId} (user {UserId}), attempt {Attempt}/{Attempts}.",
                    sanitizedDestination, invitationId, user.Id, attempt, attempts);

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
                        "Webhook HTTP Status: {StatusCode}. Invitation webhook delivered successfully for invitation {InvitationId} (user {UserId}) on attempt {Attempt}.",
                        (int)response.StatusCode, invitationId, userId, attempt);
                    return (true, false);
                }

                // 4xx means n8n rejected the request itself (bad secret, workflow not
                // active, wrong path) - retrying the identical payload would not help.
                var retryable = (int)response.StatusCode >= 500
                    || response.StatusCode == System.Net.HttpStatusCode.RequestTimeout;

                var responseBody = await ReadSanitizedResponseBodyAsync(response, cancellationToken);

                _logger.LogWarning(
                    "Failed to send invitation webhook. Webhook HTTP Status: {StatusCode} for invitation {InvitationId} (user {UserId}), attempt {Attempt}/{Attempts}. Response: {ResponseBody}",
                    (int)response.StatusCode, invitationId, userId, attempt, attempts, responseBody);

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

        // n8n's own error responses are short diagnostic text/JSON (e.g. "workflow not
        // active", "not registered") and never contain our data, but this is still an
        // externally-controlled string: bound its size and refuse to log it verbatim if
        // it happens to mention a token, so a pathological echo can never leak one.
        private static async Task<string> ReadSanitizedResponseBodyAsync(
            HttpResponseMessage response, CancellationToken cancellationToken)
        {
            string raw;
            try
            {
                raw = await response.Content.ReadAsStringAsync(cancellationToken);
            }
            catch
            {
                return "(body unavailable)";
            }

            if (string.IsNullOrWhiteSpace(raw))
            {
                return "(empty)";
            }

            var singleLine = raw.Replace('\r', ' ').Replace('\n', ' ').Trim();

            if (singleLine.Contains("token", StringComparison.OrdinalIgnoreCase))
            {
                return "(redacted: response unexpectedly referenced a token)";
            }

            const int maxLength = 300;
            return singleLine.Length > maxLength
                ? string.Concat(singleLine.AsSpan(0, maxLength), "...(truncated)")
                : singleLine;
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

            // n8n only serves a "webhook-test" path while that workflow is open and
            // listening in the editor - every invitation sent while nobody has it open
            // fails the same way a missing/wrong URL does. This is the single most common
            // cause of "created but could not be handed off for delivery" in production.
            if (parsedWebhook.AbsolutePath.Contains("webhook-test", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "{Key} points at an n8n TEST webhook path ('webhook-test'), which only responds while the workflow is open in the n8n editor. Point it at the workflow's Production URL ('webhook' path) instead.",
                    N8nInvitationOptions.EnvWebhookUrl);
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
