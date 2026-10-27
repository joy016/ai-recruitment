using ai_recruitment.Features.ApplicantScreening.Dto;
using ai_recruitment.Features.ApplicantScreening.Model;
using ai_recruitment.Service;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace ai_recruitment.Features.ApplicantScreening.Services
{
    public class N8nApplicantScreeningWebhookService : IApplicantScreeningWebhookService
    {
        private readonly HttpClient _httpClient;
        private readonly ISupabaseStorageService _supabaseStorageService;
        private readonly N8nScreeningOptions _options;
        private readonly ILogger<N8nApplicantScreeningWebhookService> _logger;

        public N8nApplicantScreeningWebhookService(
            HttpClient httpClient,
            ISupabaseStorageService supabaseStorageService,
            IOptions<N8nScreeningOptions> options,
            ILogger<N8nApplicantScreeningWebhookService> logger)
        {
            _httpClient = httpClient;
            _supabaseStorageService = supabaseStorageService;
            _options = options.Value;
            _logger = logger;
        }

        public async Task<(bool Delivered, bool Retryable, string? Error)> TrySendAsync(
            ScreeningWebhookOutbox outboxEntry,
            CancellationToken cancellationToken = default)
        {
            if (!TryBuildWebhookUri(out var webhookUri, out var configError))
            {
                // A configuration problem is never retryable - retrying would hit the
                // same missing/invalid URL every time.
                return (false, false, configError);
            }

            try
            {
                var requestBody = await BuildRequestBodyWithFreshSignedUrlAsync(outboxEntry, cancellationToken);

                using var request = new HttpRequestMessage(HttpMethod.Post, webhookUri)
                {
                    Content = new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json"),
                };

                if (!string.IsNullOrWhiteSpace(_options.WebhookSecret))
                {
                    request.Headers.TryAddWithoutValidation(_options.SecretHeaderName, _options.WebhookSecret);
                }

                // Same value on every retry of this outbox row (see ScreeningRequestPublisher),
                // so n8n can dedupe a redelivery even before reading the request body.
                request.Headers.TryAddWithoutValidation("Idempotency-Key", outboxEntry.Id.ToString());

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Delivered applicant-screening event {OutboxId} for Candidate {CandidateId} to n8n.",
                        outboxEntry.Id, outboxEntry.CandidateId);
                    return (true, false, null);
                }

                // 4xx means n8n rejected the request itself (bad secret, workflow not
                // active, wrong path) - retrying the identical payload would not help.
                var retryable = (int)response.StatusCode >= 500
                    || response.StatusCode == System.Net.HttpStatusCode.RequestTimeout;

                var body = await ReadBoundedBodyAsync(response, cancellationToken);

                _logger.LogWarning(
                    "n8n screening webhook returned {StatusCode} for outbox {OutboxId} (Candidate {CandidateId}). Response: {Body}",
                    (int)response.StatusCode, outboxEntry.Id, outboxEntry.CandidateId, body);

                return (false, retryable, $"HTTP {(int)response.StatusCode}: {body}");
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "n8n screening webhook timed out after {Timeout}s for outbox {OutboxId} (Candidate {CandidateId}).",
                    _options.TimeoutSeconds, outboxEntry.Id, outboxEntry.CandidateId);
                return (false, true, "Request timed out.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(
                    ex,
                    "n8n screening webhook request failed for outbox {OutboxId} (Candidate {CandidateId}).",
                    outboxEntry.Id, outboxEntry.CandidateId);
                return (false, true, ex.Message);
            }
        }

        // The stored outbox Payload never carries a download link (see ResumeWebhookDto) -
        // one is minted here, immediately before this specific send attempt, so a row that
        // sat in the queue for a while (first attempt, a retry after backoff, whatever)
        // never ships a signed URL that has since expired.
        private async Task<string> BuildRequestBodyWithFreshSignedUrlAsync(
            ScreeningWebhookOutbox outboxEntry,
            CancellationToken cancellationToken)
        {
            ApplicantScreeningWebhookPayload? payload;
            try
            {
                payload = JsonSerializer.Deserialize<ApplicantScreeningWebhookPayload>(outboxEntry.Payload);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Stored payload for outbox {OutboxId} is not valid JSON; sending as-is.", outboxEntry.Id);
                return outboxEntry.Payload;
            }

            if (payload?.Resume == null || string.IsNullOrWhiteSpace(payload.Resume.FilePath))
            {
                return outboxEntry.Payload;
            }

            try
            {
                payload.Resume.DownloadUrl = await _supabaseStorageService.CreateSignedUrlAsync(
                    payload.Resume.Bucket,
                    payload.Resume.FilePath,
                    _supabaseStorageService.ResumeSignedUrlExpirationSeconds);
            }
            catch (Exception ex)
            {
                // Degrade gracefully: n8n still gets candidate/job data even if the resume
                // link couldn't be refreshed right now (e.g. Supabase is briefly down).
                _logger.LogWarning(
                    ex,
                    "Could not refresh the resume signed URL for outbox {OutboxId} (Candidate {CandidateId}); delivering without resume.downloadUrl.",
                    outboxEntry.Id, outboxEntry.CandidateId);
            }

            return JsonSerializer.Serialize(payload);
        }

        private bool TryBuildWebhookUri(out Uri webhookUri, out string? error)
        {
            webhookUri = null!;
            error = null;

            if (string.IsNullOrWhiteSpace(_options.WebhookUrl))
            {
                error = $"{N8nScreeningOptions.EnvWebhookUrl} is not configured.";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (!Uri.TryCreate(_options.WebhookUrl, UriKind.Absolute, out var parsed))
            {
                error = $"{N8nScreeningOptions.EnvWebhookUrl} is not a valid absolute URL.";
                _logger.LogError("{Error}", error);
                return false;
            }

            if (parsed.Scheme != Uri.UriSchemeHttps && !(_options.AllowInsecureHttp && parsed.IsLoopback))
            {
                error = $"{N8nScreeningOptions.EnvWebhookUrl} must use HTTPS (plain http is only permitted for loopback addresses in Development).";
                _logger.LogError("{Error}", error);
                return false;
            }

            // Same caveat as the invitation webhook: n8n only serves "webhook-test" while
            // the workflow is open in the editor, so pointing production at it silently
            // "fails" the same way a wrong URL would.
            if (parsed.AbsolutePath.Contains("webhook-test", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "{Key} points at an n8n TEST webhook path ('webhook-test'), which only responds while the workflow is open in the n8n editor. Point it at the workflow's Production URL ('webhook' path) instead.",
                    N8nScreeningOptions.EnvWebhookUrl);
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

            // n8n's own error responses are short diagnostic text and never contain our
            // data, but this is still an externally-controlled string: if it happens to
            // echo back a signed resume URL (token=...), refuse to log it verbatim.
            if (singleLine.Contains("token=", StringComparison.OrdinalIgnoreCase)
                || singleLine.Contains("signature=", StringComparison.OrdinalIgnoreCase))
            {
                return "(redacted: response unexpectedly referenced a signed URL)";
            }

            const int maxLength = 300;
            return singleLine.Length > maxLength
                ? string.Concat(singleLine.AsSpan(0, maxLength), "...(truncated)")
                : singleLine;
        }
    }
}
