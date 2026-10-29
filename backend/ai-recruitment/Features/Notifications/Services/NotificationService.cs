using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Notifications.Dto;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Notifications.Services
{
    public class NotificationService : INotificationService
    {
        // Which permission a user's role must hold to be a candidate recipient for a
        // category. Reuses the same Candidates/Interviews/JobPosts/Settings permissions
        // already gating the corresponding screens, rather than inventing new ones.
        private static readonly IReadOnlyDictionary<NotificationCategory, string> RequiredPermissionByCategory =
            new Dictionary<NotificationCategory, string>
            {
                [NotificationCategory.NewApplicant] = PermissionNames.Candidates.View,
                [NotificationCategory.InterviewScheduled] = PermissionNames.Interviews.View,
                [NotificationCategory.InterviewRescheduled] = PermissionNames.Interviews.View,
                [NotificationCategory.CandidateStatusChanged] = PermissionNames.Candidates.View,
                [NotificationCategory.JobPostUpdates] = PermissionNames.JobPosts.View,
                [NotificationCategory.System] = PermissionNames.Settings.View,
                [NotificationCategory.AiScreening] = PermissionNames.Candidates.View,
                [NotificationCategory.InterviewUpdates] = PermissionNames.Interviews.View,
            };

        private readonly AppDbContext _context;
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(AppDbContext context, ILogger<NotificationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task NotifyAsync(
            NotificationType type,
            NotificationContext context,
            string deduplicationKey,
            CancellationToken cancellationToken,
            bool critical = false)
        {
            try
            {
                var category = NotificationTypeMap.GetCategory(type);

                var recipientIds = await ResolveRecipientsAsync(category, cancellationToken);
                if (recipientIds.Count == 0)
                {
                    return;
                }

                var eligibleRecipientIds = await FilterByPreferenceAsync(recipientIds, category, critical, cancellationToken);
                if (eligibleRecipientIds.Count == 0)
                {
                    return;
                }

                var alreadyNotified = await _context.Set<Notification>()
                    .Where(n => eligibleRecipientIds.Contains(n.RecipientUserId) && n.DeduplicationKey == deduplicationKey)
                    .Select(n => n.RecipientUserId)
                    .ToListAsync(cancellationToken);

                var recipientsToNotify = eligibleRecipientIds.Except(alreadyNotified).ToList();
                if (recipientsToNotify.Count == 0)
                {
                    return;
                }

                var now = DateTime.UtcNow;
                var rows = recipientsToNotify
                    .Select(recipientId => new Notification
                    {
                        Id = Guid.NewGuid(),
                        RecipientUserId = recipientId,
                        Type = type,
                        Category = category,
                        Severity = context.Severity,
                        Title = context.Title,
                        Message = context.Message,
                        CandidateId = context.CandidateId,
                        JobId = context.JobId,
                        InterviewId = context.InterviewId,
                        DeduplicationKey = deduplicationKey,
                        CreatedAt = now,
                    })
                    .ToList();

                _context.Set<Notification>().AddRange(rows);

                try
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException)
                {
                    // Another concurrent writer (e.g. a second app instance's reminder sweep)
                    // raced us for the same (RecipientUserId, DeduplicationKey) pair. Fall back
                    // to inserting one row at a time so the rows that don't conflict still land.
                    await InsertRowsIndividuallyAsync(rows, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create notifications for {Type} (dedup key '{DeduplicationKey}').", type, deduplicationKey);
            }
        }

        private async Task InsertRowsIndividuallyAsync(List<Notification> rows, CancellationToken cancellationToken)
        {
            foreach (var row in rows)
            {
                _context.Entry(row).State = EntityState.Detached;
            }

            foreach (var row in rows)
            {
                _context.Set<Notification>().Add(row);
                try
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException)
                {
                    _context.Entry(row).State = EntityState.Detached;
                }
            }
        }

        private async Task<List<Guid>> ResolveRecipientsAsync(NotificationCategory category, CancellationToken cancellationToken)
        {
            var requiredPermission = RequiredPermissionByCategory[category];

            return await _context.Users
                .AsNoTracking()
                .Where(u => u.IsActive && u.PasswordSetupCompletedAt != null)
                .Where(u => u.Role.Permissions.Any(p => p.PermissionName == requiredPermission))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);
        }

        private async Task<List<Guid>> FilterByPreferenceAsync(
            List<Guid> recipientIds,
            NotificationCategory category,
            bool critical,
            CancellationToken cancellationToken)
        {
            var stored = await _context.Set<NotificationPreference>()
                .AsNoTracking()
                .Where(p => recipientIds.Contains(p.UserId) && p.Category == category)
                .ToDictionaryAsync(p => p.UserId, p => p.IsEnabled, cancellationToken);

            var defaultEnabled = NotificationCategoryMetadata.DefaultEnabled(category);
            var bypassesPreference = critical && category == NotificationCategory.System;

            return recipientIds
                .Where(id =>
                {
                    if (bypassesPreference)
                    {
                        return true;
                    }

                    return stored.TryGetValue(id, out var isEnabled) ? isEnabled : defaultEnabled;
                })
                .ToList();
        }

        public async Task<(IReadOnlyList<NotificationDto> Items, int TotalCount)> GetNotificationsAsync(
            Guid userId,
            int page,
            int pageSize,
            bool unreadOnly,
            CancellationToken cancellationToken)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Set<Notification>()
                .AsNoTracking()
                .Where(n => n.RecipientUserId == userId);

            if (unreadOnly)
            {
                query = query.Where(n => !n.IsRead);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Type = n.Type.ToString(),
                    Category = n.Category.ToString(),
                    Severity = n.Severity.ToString(),
                    Title = n.Title,
                    Message = n.Message,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt,
                    CandidateId = n.CandidateId,
                    JobId = n.JobId,
                    InterviewId = n.InterviewId,
                })
                .ToListAsync(cancellationToken);

            return (items, totalCount);
        }

        public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken)
        {
            return await _context.Set<Notification>()
                .AsNoTracking()
                .CountAsync(n => n.RecipientUserId == userId && !n.IsRead, cancellationToken);
        }

        public async Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken)
        {
            var notification = await _context.Set<Notification>()
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientUserId == userId, cancellationToken);

            if (notification == null)
            {
                return false;
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }

            return true;
        }

        public async Task<int> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;

            var unread = await _context.Set<Notification>()
                .Where(n => n.RecipientUserId == userId && !n.IsRead)
                .ToListAsync(cancellationToken);

            foreach (var notification in unread)
            {
                notification.IsRead = true;
                notification.ReadAt = now;
            }

            if (unread.Count > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            return unread.Count;
        }
    }
}
