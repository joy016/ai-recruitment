namespace ai_recruitment.Features.Dashboard.Services
{
    // Bound in Program.cs from an environment variable first, falling back to appsettings -
    // mirrors every other feature's Options class resolution order (see N8nEmailOptions etc).
    public class DashboardOptions
    {
        public const string EnvTimeZoneId = "DASHBOARD_TIME_ZONE";

        // IANA id (e.g. "Asia/Manila") used to compute the Weekly Application Volume chart's
        // Mon-Sun week boundaries. Falls back to UTC if unset or not recognized by the host.
        public string TimeZoneId { get; set; } = "Asia/Manila";
    }
}
