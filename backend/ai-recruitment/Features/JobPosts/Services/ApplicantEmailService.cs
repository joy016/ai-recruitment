using System.Net.Http.Json;
using ai_recruitment.Features.JobPosts.Dto;

namespace ai_recruitment.Features.JobPosts.Services
{
    // Hands the application-form link off to the n8n workflow, which owns composing and
    // sending the actual email. Registered as a typed HttpClient so it shares
    // IHttpClientFactory's handler pooling.
    //
    // A configuration or transport problem is reported as false, never as an exception:
    // the controller turns that into a 400 rather than letting it surface as a 500.
    public class ApplicantEmailService : IApplicationEmailService
    {
        public const string WebhookUrlConfigKey = "N8n:SendApplicationFormWebhookUrl";

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ApplicantEmailService> _logger;

        public ApplicantEmailService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<ApplicantEmailService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendApplicationLinkAsync(ApplicationFormPayload dto)
        {
            var webhookUrl = _configuration[WebhookUrlConfigKey];

            if (string.IsNullOrWhiteSpace(webhookUrl))
            {
                _logger.LogError("{Key} is not configured; cannot send the application form link.", WebhookUrlConfigKey);
                return false;
            }

            if (!Uri.TryCreate(webhookUrl, UriKind.Absolute, out var webhookUri))
            {
                _logger.LogError("{Key} is not a valid absolute URL.", WebhookUrlConfigKey);
                return false;
            }

            try
            {
                using var response = await _httpClient.PostAsJsonAsync(webhookUri, dto);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Application form webhook returned HTTP {StatusCode} for {Destination}.",
                        (int)response.StatusCode, webhookUri.GetLeftPart(UriPartial.Path));
                    return false;
                }

                return true;
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "Application form webhook request failed.");
                return false;
            }
            catch (TaskCanceledException ex)
            {
                // HttpClient surfaces its own timeout as a cancellation.
                _logger.LogWarning(ex, "Application form webhook request timed out.");
                return false;
            }
        }
    }
}
