using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Notifications.Dto
{
    public class UpdateNotificationPreferenceDto
    {
        [Required]
        public required string Category { get; set; }

        public bool IsEnabled { get; set; }
    }
}
