namespace ai_recruitment.Service
{
    public class SupabaseStorageOptions
    {
        public string Url { get; set; } = string.Empty;
        public string ServiceRoleKey { get; set; } = string.Empty;
    }

    public interface ISupabaseStorageService
    {
        Task<string> UploadAsync(string bucket, string path, Stream content, string contentType);
    }

    // Talks to the Supabase Storage REST API directly instead of pulling in the
    // supabase-csharp SDK, since the service-role key is all that's needed for
    // server-side uploads to a bucket.
    public class SupabaseStorageService : ISupabaseStorageService
    {
        private readonly HttpClient _httpClient;
        private readonly SupabaseStorageOptions _options;

        public SupabaseStorageService(HttpClient httpClient, IConfiguration configuration)
        {
            _options = configuration.GetSection("Supabase").Get<SupabaseStorageOptions>()
                ?? throw new InvalidOperationException("Supabase configuration is missing.");

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
    }
}
