namespace ai_recruitment.Features.Security.Dto
{
    /// <summary>One row of GET /api/Security/getActiveSessions.</summary>
    /// <example>{ "sessionId": "b1a0c0e0-...", "deviceLabel": "Chrome on Windows", "browser": "Chrome", "operatingSystem": "Windows", "ipAddress": "127.0.0.1", "createdAt": "2026-09-24T01:42:00Z", "lastActiveAt": "2026-09-24T02:10:00Z", "isCurrent": true }</example>
    public class ActiveSessionDto
    {
        public Guid SessionId { get; set; }
        public string DeviceLabel { get; set; } = string.Empty;
        public string? Browser { get; set; }
        public string? OperatingSystem { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastActiveAt { get; set; }
        public bool IsCurrent { get; set; }
    }
}
