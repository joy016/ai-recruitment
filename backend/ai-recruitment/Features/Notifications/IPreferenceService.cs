using ai_recruitment.Features.Notifications.Dto;

namespace ai_recruitment.Features.Notifications
{
    public interface IPreferenceService
    {
        // Every category, with its effective value (the stored row if one exists, otherwise
        // NotificationCategoryMetadata.DefaultEnabled).
        Task<IReadOnlyList<NotificationPreferenceDto>> GetPreferencesAsync(Guid userId, CancellationToken cancellationToken);

        // Upserts each entry and returns the full, updated set (same shape as GetPreferencesAsync).
        // Throws ArgumentException if any Category value doesn't parse to NotificationCategory.
        Task<IReadOnlyList<NotificationPreferenceDto>> UpdatePreferencesAsync(
            Guid userId,
            IReadOnlyList<UpdateNotificationPreferenceDto> updates,
            CancellationToken cancellationToken);
    }
}
