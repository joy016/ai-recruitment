namespace ai_recruitment.Features.Security
{
    // A small, dependency-free User-Agent parser - just enough to label a session as
    // "Chrome on Windows" for the Active Sessions list. Not meant to be exhaustive; extend the
    // checks here (and only here) if a device label looks wrong for a real browser/OS.
    public static class UserAgentParser
    {
        public static (string? Browser, string? OperatingSystem) Parse(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent))
            {
                return (null, null);
            }

            string? browser = userAgent switch
            {
                var ua when ua.Contains("Edg/") => "Edge",
                var ua when ua.Contains("OPR/") || ua.Contains("Opera") => "Opera",
                var ua when ua.Contains("Chrome/") && !ua.Contains("Chromium") => "Chrome",
                var ua when ua.Contains("Firefox/") => "Firefox",
                var ua when ua.Contains("Safari/") && !ua.Contains("Chrome") => "Safari",
                _ => null,
            };

            string? operatingSystem = userAgent switch
            {
                var ua when ua.Contains("Windows") => "Windows",
                var ua when ua.Contains("Mac OS X") || ua.Contains("Macintosh") => "macOS",
                var ua when ua.Contains("Android") => "Android",
                var ua when ua.Contains("iPhone") || ua.Contains("iPad") => "iOS",
                var ua when ua.Contains("Linux") => "Linux",
                _ => null,
            };

            return (browser, operatingSystem);
        }

        public static string BuildDeviceLabel(string? browser, string? operatingSystem)
        {
            if (browser != null && operatingSystem != null)
            {
                return $"{browser} on {operatingSystem}";
            }

            return browser ?? operatingSystem ?? "Unknown device";
        }
    }
}
