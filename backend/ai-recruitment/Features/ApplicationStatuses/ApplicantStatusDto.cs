using System;

namespace ai_recruitment.Features.ApplicationStatuses
{
    public class ApplicantStatusDto
    {
        public int StatusId { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Color { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
