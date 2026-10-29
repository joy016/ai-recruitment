using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Notifications.Model
{
    // A missing row for a (UserId, Category) pair means "use the default" - see
    // NotificationCategoryMetadata.DefaultEnabled - so rows are only ever written when a user
    // actually changes a toggle away from its default, never seeded wholesale per user.
    public class NotificationPreference
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public NotificationCategory Category { get; set; }
        public bool IsEnabled { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
