using System.Text.Json;

namespace ai_recruitment.Service
{
    public class SupabaseStorageOptions
    {
        public string Url { get; set; } = string.Empty;
        public string ServiceRoleKey { get; set; } = string.Empty;

        // Private bucket resumes are uploaded into (see CandidatesController.CreateCandidate).
        public string ResumeBucket { get; set; } = "resume";

        // Default lifetime for a resume signed URL (see CreateSignedUrlAsync). Generated
        // fresh every time one is needed - never persisted - so this only bounds how long
        // a single use is valid for, e.g. while n8n fetches the file.
        public int SignedUrlExpirationSeconds { get; set; } = 900;
    }

    // Thrown by CreateSignedUrlAsync specifically when the object doesn't exist in the
    // bucket, so callers can return 404 instead of lumping every signing failure
    // (auth problems, Supabase being down, etc.) into the same status code.
    public class SupabaseObjectNotFoundException : Exception
    {
        public SupabaseObjectNotFoundException(string message) : base(message) { }
    }

    public interface ISupabaseStorageService
    {
        string ResumeBucket { get; }
        int ResumeSignedUrlExpirationSeconds { get; }

        // Returns the bucket's "public" URL for the uploaded object. Only meaningful for a
        // public bucket (e.g. "avatars" - see UsersController); for a private bucket like
        // "resume", the returned URL will not actually be fetchable and the caller should
        // use CreateSignedUrlAsync instead.
        Task<string> UploadAsync(string bucket, string path, Stream content, string contentType);

        // A short-lived URL that can fetch one object from a private bucket. Never persist
        // the result - generate a fresh one immediately before each use instead.
        Task<string> CreateSignedUrlAsync(string bucket, string path, int expiresInSeconds);

        // Best-effort cleanup (e.g. compensating for a DB save that failed after upload).
        // Never throws - a leftover orphaned object is preferable to masking the original error.
        Task DeleteAsync(string bucket, string path);
    }

    // Talks to the Supabase Storage REST API directly instead of pulling in the
    // supabase-csharp SDK, since the service-role key is all that's needed for
    // server-side uploads to a bucket.
    public class SupabaseStorageService : ISupabaseStorageService
    {
        private readonly HttpClient _httpClient;
        private readonly SupabaseStorageOptions _options;
        private readonly ILogger<SupabaseStorageService> _logger;

        public string ResumeBucket => _options.ResumeBucket;
        public int ResumeSignedUrlExpirationSeconds => _options.SignedUrlExpirationSeconds;

        public SupabaseStorageService(HttpClient httpClient, IConfiguration configuration, ILogger<SupabaseStorageService> logger)
        {
            _options = configuration.GetSection("Supabase").Get<SupabaseStorageOptions>()
                ?? throw new InvalidOperationException("Supabase configuration is missing.");

            _logger = logger;
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(_options.Url);
            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
            _httpClient.DefaultRequestHeaders.Add("apikey", _options.ServiceRoleKey);
        }

        public async Task<string> UploadAsync(string bucket, string path, Stream content, string contentType)
        {
            using var requestContent = new StreamContent(content);
            requestContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);

            var request = new HttpRequestMessage(HttpMethod.Put, $"/storage/v1/object/{bucket}/{path}")
            {
                Content = requestContent,
            };
            // Overwrite any existing file at this path instead of failing on conflict.
            request.Headers.Add("x-upsert", "true");

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Failed to upload file to Supabase storage: {response.StatusCode} - {error}");
            }

            return $"{_options.Url}/storage/v1/object/public/{bucket}/{path}";
        }

        public async Task<string> CreateSignedUrlAsync(string bucket, string path, int expiresInSeconds)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"/storage/v1/object/sign/{bucket}/{path}")
            {
                Content = JsonContent.Create(new { expiresIn = expiresInSeconds }),
            };

            using var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();

                if (IndicatesObjectNotFound(response.StatusCode, error))
                {
                    throw new SupabaseObjectNotFoundException($"Object not found: {bucket}/{path}");
                }

                throw new InvalidOperationException($"Failed to create signed URL: {response.StatusCode} - {error}");
            }

            using var stream = await response.Content.ReadAsStreamAsync();
            using var json = await JsonDocument.ParseAsync(stream);

            var signedPath = json.RootElement.GetProperty("signedURL").GetString();
            if (string.IsNullOrWhiteSpace(signedPath))
            {
                throw new InvalidOperationException("Supabase did not return a signedURL.");
            }

            // signedPath is relative (e.g. "/object/sign/{bucket}/{path}?token=..."); the
            // storage API is mounted under /storage/v1.
            return $"{_options.Url}/storage/v1{signedPath}";
        }

        // Supabase Storage's sign endpoint frequently reports a missing object as HTTP 400
        // with the real status embedded in the JSON body (e.g. {"statusCode":"404",
        // "error":"not_found",...}) rather than an actual HTTP 404, so the raw status code
        // alone isn't enough to tell "missing file" apart from "signing failed".
        private static bool IndicatesObjectNotFound(System.Net.HttpStatusCode statusCode, string responseBody)
        {
            if (statusCode == System.Net.HttpStatusCode.NotFound)
            {
                return true;
            }

            try
            {
                using var doc = JsonDocument.Parse(responseBody);

                if (doc.RootElement.TryGetProperty("statusCode", out var statusCodeProp))
                {
                    var value = statusCodeProp.ValueKind == JsonValueKind.String
                        ? statusCodeProp.GetString()
                        : statusCodeProp.ToString();

                    if (value == "404")
                    {
                        return true;
                    }
                }

                if (doc.RootElement.TryGetProperty("error", out var errorProp)
                    && string.Equals(errorProp.GetString(), "not_found", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            catch (JsonException)
            {
                // Not a JSON body - can't tell, so fall through and treat it as a generic failure.
            }

            return false;
        }

        public async Task DeleteAsync(string bucket, string path)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, $"/storage/v1/object/{bucket}")
                {
                    Content = JsonContent.Create(new { prefixes = new[] { path } }),
                };

                using var response = await _httpClient.SendAsync(request);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Best-effort delete of {Bucket}/{Path} from Supabase storage failed: {Status} - {Error}", bucket, path, response.StatusCode, error);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Best-effort delete of {Bucket}/{Path} from Supabase storage threw.", bucket, path);
            }
        }
    }
}
