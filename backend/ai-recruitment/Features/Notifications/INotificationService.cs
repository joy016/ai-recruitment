using ai_recruitment.Features.Notifications.Dto;
using ai_recruitment.Features.Notifications.Model;

namespace ai_recruitment.Features.Notifications
{
    public interface INotificationService
    {
        // Resolves the category from type, resolves recipients, drops anyone who disabled
        // that category (unless critical=true and the category is System), skips recipients
        // who already have a row for deduplicationKey, and writes the rest. Never throws -
        // any failure is logged and swallowed so a notification bug can never fail the
        // caller's own operation.
        Task NotifyAsync(
            NotificationType type,
            NotificationContext context,
            string deduplicationKey,
            CancellationToken cancellationToken,
            bool critical = false);

        Task<(IReadOnlyList<NotificationDto> Items, int TotalCount)> GetNotificationsAsync(
            Guid userId,
            int page,
            int pageSize,
            bool unreadOnly,
            CancellationToken cancellationToken);

        Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken);

        // Returns false when the notification doesn't exist or doesn't belong to userId.
        Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken);

        // Returns the number of rows updated.
        Task<int> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken);
    }
}
