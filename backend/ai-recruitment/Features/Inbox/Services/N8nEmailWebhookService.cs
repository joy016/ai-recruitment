using System.Net.Http.Json;
using System.Text.Json;
using ai_recruitment.Features.Inbox.Dto;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Inbox.Services
{
    // Delivers one outbound send request to n8n (Workflow A "Send Email" - see
    // n8n/send-email.workflow.json). Mirrors N8nCandidateStatusWebhookService's
    // timeout/retryability/HTTPS-or-loopback validation logic.
    public class N8nEmailWebhookService : IN8nEmailWebhookService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly HttpClient _httpClient;
        private readonly N8nEmailOptions _options;
        private readonly ILogger<N8nEmailWebhookService> _logger;

        public N8nEmailWebhookService(HttpClient httpClient, IOptions<N8nEmailOptions> options, ILogger<N8nEmailWebhookService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            Guid messageId,
            N8nSendEmailPayload payload,
            CancellationToken cancellationToken = default)
        {
            if (!TryBuildWebhookUri(out var webhookUri, out var configError))
            {
                return (false, false, configError);
            }

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, webhookUri)
                {
                    Content = JsonContent.Create(payload, options: JsonOptions),
                };

                if (!string.IsNullOrWhiteSpace(_options.SharedSecret))
                {
                    request.Headers.TryAddWithoutValidation(_options.SecretHeaderName, _options.SharedSecret);
                }

                // Same value on every retry of this message, so n8n can dedupe a redelivery
                // before even reading the body.
                request.Headers.TryAddWithoutValidation("Idempotency-Key", messageId.ToString());

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Delivered send-email request {MessageId} to n8n.", messageId);
                    return (true, false, null);
                }

                var retryable = (int)response.StatusCode >= 500
                    || response.StatusCode == System.Net.HttpStatusCode.RequestTimeout;

                var body = await ReadBoundedBodyAsync(response, cancellationToken);

                _logger.LogWarning(
                    "n8n send-email webhook returned {StatusCode} for message {MessageId}. Response: {Body}",
                    (int)response.StatusCode, messageId, body);

                return (false, retryable, $"HTTP {(int)response.StatusCode}: {body}");
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("n8n send-email webhook timed out after {Timeout}s for message {MessageId}.", _options.TimeoutSeconds, messageId);
                return (false, true, "Request timed out.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "n8n send-email webhook request failed for message {MessageId}.", messageId);
                return (false, true, ex.Message);
            }
        }

        private bool TryBuildWebhookUri(out Uri webhookUri, out string? error)
        {
            webhookUri = null!;
            error = null;

            if (string.IsNullOrWhiteSpace(_options.WebhookUrl))
            {
                error = $"{N8nEmailOptions.EnvWebhookUrl} is not configured.";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (!Uri.TryCreate(_options.WebhookUrl, UriKind.Absolute, out var parsed))
            {
                error = $"{N8nEmailOptions.EnvWebhookUrl} is not a valid absolute URL.";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (parsed.Scheme != Uri.UriSchemeHttps && !(_options.AllowInsecureHttp && parsed.IsLoopback))
            {
                error = $"{N8nEmailOptions.EnvWebhookUrl} must use HTTPS (plain http is only permitted for loopback addresses in Development).";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (parsed.AbsolutePath.Contains("webhook-test", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "{Key} points at an n8n TEST webhook path ('webhook-test'), which only responds while the workflow is open in the n8n editor. Point it at the workflow's Production URL ('webhook' path) instead.",
                    N8nEmailOptions.EnvWebhookUrl);
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
