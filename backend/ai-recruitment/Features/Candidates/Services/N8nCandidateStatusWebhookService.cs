using ai_recruitment.Features.Candidates.model;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Candidates.Services
{
    public class N8nCandidateStatusWebhookService : IN8nCandidateStatusWebhookService
    {
        private readonly HttpClient _httpClient;
        private readonly N8nCandidateStatusOptions _options;
        private readonly ILogger<N8nCandidateStatusWebhookService> _logger;

        public N8nCandidateStatusWebhookService(
            HttpClient httpClient,
            IOptions<N8nCandidateStatusOptions> options,
            ILogger<N8nCandidateStatusWebhookService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            CandidateStatusWebhookOutbox outboxEntry,
            CancellationToken cancellationToken = default)
        {
            if (!_options.Enabled)
            {
                // Not retryable: flipping the flag back on is the only thing that would
                // change the outcome, and the periodic sweep will pick the row up then.
                return (false, false, "Candidate-status webhook delivery is disabled (N8n:CandidateStatus:Enabled = false).");
            }

            if (!TryBuildWebhookUri(out var webhookUri, out var configError))
            {
                return (false, false, configError);
            }

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, webhookUri)
                {
                    Content = new StringContent(outboxEntry.Payload, System.Text.Encoding.UTF8, "application/json"),
                };

                if (!string.IsNullOrWhiteSpace(_options.WebhookSecret))
                {
                    request.Headers.TryAddWithoutValidation(_options.SecretHeaderName, _options.WebhookSecret);
                }

                // Same value on every retry of this outbox row, so n8n can dedupe a
                // redelivery even before reading the request body.
                request.Headers.TryAddWithoutValidation("Idempotency-Key", outboxEntry.Id.ToString());

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Delivered candidate-status-changed event {OutboxId} for Candidate {CandidateId} (new status '{NewStatus}') to n8n.",
                        outboxEntry.Id, outboxEntry.CandidateId, outboxEntry.NewStatus);
                    return (true, false, null);
                }

                // 4xx means n8n rejected the request itself (bad secret, workflow not
                // active, wrong path) - retrying the identical payload would not help.
                var retryable = (int)response.StatusCode >= 500
                    || response.StatusCode == System.Net.HttpStatusCode.RequestTimeout;

                var body = await ReadBoundedBodyAsync(response, cancellationToken);

                _logger.LogWarning(
                    "n8n candidate-status webhook returned {StatusCode} for outbox {OutboxId} (Candidate {CandidateId}, new status '{NewStatus}'). Response: {Body}",
                    (int)response.StatusCode, outboxEntry.Id, outboxEntry.CandidateId, outboxEntry.NewStatus, body);

                return (false, retryable, $"HTTP {(int)response.StatusCode}: {body}");
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "n8n candidate-status webhook timed out after {Timeout}s for outbox {OutboxId} (Candidate {CandidateId}, new status '{NewStatus}').",
                    _options.TimeoutSeconds, outboxEntry.Id, outboxEntry.CandidateId, outboxEntry.NewStatus);
                return (false, true, "Request timed out.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(
                    ex,
                    "n8n candidate-status webhook request failed for outbox {OutboxId} (Candidate {CandidateId}, new status '{NewStatus}').",
                    outboxEntry.Id, outboxEntry.CandidateId, outboxEntry.NewStatus);
                return (false, true, ex.Message);
            }
        }

        private bool TryBuildWebhookUri(out Uri webhookUri, out string? error)
        {
            webhookUri = null!;
            error = null;

            if (string.IsNullOrWhiteSpace(_options.WebhookUrl))
            {
                error = $"{N8nCandidateStatusOptions.EnvWebhookUrl} is not configured.";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (!Uri.TryCreate(_options.WebhookUrl, UriKind.Absolute, out var parsed))
            {
                error = $"{N8nCandidateStatusOptions.EnvWebhookUrl} is not a valid absolute URL.";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (parsed.Scheme != Uri.UriSchemeHttps && !(_options.AllowInsecureHttp && parsed.IsLoopback))
            {
                error = $"{N8nCandidateStatusOptions.EnvWebhookUrl} must use HTTPS (plain http is only permitted for loopback addresses in Development).";
                _logger.LogError("{Error}", error);
                return false;
            }

            // n8n only serves "webhook-test" while the workflow is open and listening in
            // the editor (one call per click of "Execute workflow"); the production path
            // is "webhook" once the workflow is activated.
            if (parsed.AbsolutePath.Contains("webhook-test", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "{Key} points at an n8n TEST webhook path ('webhook-test'), which only responds while the workflow is open in the n8n editor. Point it at the workflow's Production URL ('webhook' path) instead.",
                    N8nCandidateStatusOptions.EnvWebhookUrl);
            }

            webhookUri = parsed;
            return true;
        }

        private static async Task<string> ReadBoundedBodyAsync(HttpResponseMessage response, CancellationToken cancellationToken)
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

            const int maxLength = 300;
            return singleLine.Length > maxLength
                ? string.Concat(singleLine.AsSpan(0, maxLength), "...(truncated)")
                : singleLine;
        }
    }
}
