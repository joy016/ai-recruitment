using ai_recruitment.Data;
using ai_recruitment.Features.Notifications.Dto;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Notifications.Services
{
    public class PreferenceService : IPreferenceService
    {
        private readonly AppDbContext _context;

        public PreferenceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<NotificationPreferenceDto>> GetPreferencesAsync(Guid userId, CancellationToken cancellationToken)
        {
            var stored = await _context.Set<NotificationPreference>()
                .AsNoTracking()
                .Where(p => p.UserId == userId)
                .ToDictionaryAsync(p => p.Category, p => p.IsEnabled, cancellationToken);

            return BuildEffectiveList(stored);
        }

        public async Task<IReadOnlyList<NotificationPreferenceDto>> UpdatePreferencesAsync(
            Guid userId,
            IReadOnlyList<UpdateNotificationPreferenceDto> updates,
            CancellationToken cancellationToken)
        {
            // Parse + validate everything up front so a bad entry fails the whole call
            // instead of partially applying.
            var parsed = new List<(NotificationCategory Category, bool IsEnabled)>();
            foreach (var update in updates)
            {
                if (!Enum.TryParse<NotificationCategory>(update.Category, ignoreCase: true, out var category))
                {
                    throw new ArgumentException($"Unknown notification category '{update.Category}'.");
                }

                parsed.Add((category, update.IsEnabled));
            }

            var categories = parsed.Select(p => p.Category).Distinct().ToList();
            var existing = await _context.Set<NotificationPreference>()
                .Where(p => p.UserId == userId && categories.Contains(p.Category))
                .ToDictionaryAsync(p => p.Category, cancellationToken);

            var now = DateTime.UtcNow;
            foreach (var (category, isEnabled) in parsed)
            {
                if (existing.TryGetValue(category, out var row))
                {
                    row.IsEnabled = isEnabled;
                    row.UpdatedAt = now;
                }
                else
                {
                    _context.Set<NotificationPreference>().Add(new NotificationPreference
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Category = category,
                        IsEnabled = isEnabled,
                        UpdatedAt = now,
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return await GetPreferencesAsync(userId, cancellationToken);
        }

        private static IReadOnlyList<NotificationPreferenceDto> BuildEffectiveList(IReadOnlyDictionary<NotificationCategory, bool> stored)
        {
            return NotificationCategoryMetadata.All
                .Select(kvp => new NotificationPreferenceDto
                {
                    Category = kvp.Key.ToString(),
                    Label = kvp.Value.Label,
                    Description = kvp.Value.Description,
                    IsEnabled = stored.TryGetValue(kvp.Key, out var isEnabled) ? isEnabled : kvp.Value.DefaultEnabled,
                })
                .ToList();
        }
    }
}
