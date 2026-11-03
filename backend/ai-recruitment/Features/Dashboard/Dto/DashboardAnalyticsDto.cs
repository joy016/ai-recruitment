namespace ai_recruitment.Features.Dashboard.Dto
{
    public class DashboardAnalyticsDto
    {
        public List<SourceCountDto> ApplicantsBySource { get; set; } = [];
        public List<JobCountDto> ApplicantsByJob { get; set; } = [];
        public List<StatusCountDto> ApplicantsByStatus { get; set; } = [];
        public List<DailyCountDto> WeeklyApplicationVolume { get; set; } = [];
    }

    public class SourceCountDto
    {
        public required string Label { get; set; }
        public int Count { get; set; }
    }

    public class JobCountDto
    {
        public int JobId { get; set; }
        public required string JobTitle { get; set; }
        public int Count { get; set; }
    }

    public class StatusCountDto
    {
        public required string Status { get; set; }
        public int Count { get; set; }
    }

    public class DailyCountDto
    {
        public required string Day { get; set; }
        public required string Date { get; set; }
        public int Count { get; set; }
    }
}
