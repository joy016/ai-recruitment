namespace ai_recruitment.Features.Notifications.Dto
{
    public class NotificationPreferenceDto
    {
        public required string Category { get; set; }
        public required string Label { get; set; }
        public required string Description { get; set; }
        public bool IsEnabled { get; set; }
    }
}
