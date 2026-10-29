using ai_recruitment.Data;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using ai_recruitment.Features.Notifications.Services;
using ai_recruitment.Features.Permissions;
using ai_recruitment.Features.Roles.Model;
using ai_recruitment.Features.Users.Model;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ai_recruitment.Tests.Features.Notifications
{
    public class NotificationServiceTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        // HR Admin holds Candidates.View, JobPosts.View and Interviews.View (see
        // PermissionSeedData) - enough to be a recipient for every category exercised below.
        private static async Task<(AppDbContext Context, Guid UserId)> SeedHrAdminAsync()
        {
            var context = CreateContext();

            context.Roles.Add(new Role { RoleId = 2, RoleName = "HR Admin", ChipColor = "#000", BackgroundColor = "#fff" });
            context.Permissions.AddRange(PermissionSeedData.Build().Where(p => p.RoleId == 2));

            var userId = Guid.NewGuid();
            context.Users.Add(new User
            {
                Id = userId,
                FirstName = "Hr",
                LastName = "Admin",
                Email = "hradmin@example.com",
                PasswordHash = "hash",
                InsertedBy = "seed",
                IsActive = true,
                PasswordSetupCompletedAt = DateTime.UtcNow,
                PhoneNumber = "09170000000",
                RoleId = 2,
            });

            await context.SaveChangesAsync();
            return (context, userId);
        }

        private static async Task<Guid> AddSecondHrAdminAsync(AppDbContext context)
        {
            var userId = Guid.NewGuid();
            context.Users.Add(new User
            {
                Id = userId,
                FirstName = "Second",
                LastName = "Hr",
                Email = "second.hr@example.com",
                PasswordHash = "hash",
                InsertedBy = "seed",
                IsActive = true,
                PasswordSetupCompletedAt = DateTime.UtcNow,
                PhoneNumber = "09170000001",
                RoleId = 2,
            });

            await context.SaveChangesAsync();
            return userId;
        }

        private static NotificationService CreateService(AppDbContext context) =>
            new(context, NullLogger<NotificationService>.Instance);

        private static NotificationContext SampleContext() => new()
        {
            Severity = NotificationSeverity.Success,
            Title = "Test Title",
            Message = "Test message.",
        };

        [Fact]
        public async Task NotifyAsync_SameDeduplicationKeyTwice_CreatesOnlyOneNotification()
        {
            var (context, userId) = await SeedHrAdminAsync();
            var service = CreateService(context);

            await service.NotifyAsync(NotificationType.AiScreeningPassed, SampleContext(), "dedupe-key", CancellationToken.None);
            await service.NotifyAsync(NotificationType.AiScreeningPassed, SampleContext(), "dedupe-key", CancellationToken.None);

            var count = await context.Notifications.CountAsync(n => n.RecipientUserId == userId);
            count.Should().Be(1, "retrying the same event (e.g. a duplicate screening callback) must not create a second notification");
        }

        [Fact]
        public async Task NotifyAsync_InterviewReminder_SameDeduplicationKeyTwice_CreatesOnlyOneNotification()
        {
            var (context, userId) = await SeedHrAdminAsync();
            var service = CreateService(context);
            var reminderKey = $"reminder:{Guid.NewGuid()}:2h";

            await service.NotifyAsync(NotificationType.InterviewReminder, SampleContext(), reminderKey, CancellationToken.None);
            await service.NotifyAsync(NotificationType.InterviewReminder, SampleContext(), reminderKey, CancellationToken.None);

            var count = await context.Notifications.CountAsync(n => n.RecipientUserId == userId);
            count.Should().Be(1, "re-matching the reminder window on a later sweep must not send a second reminder");
        }

        [Fact]
        public async Task NotifyAsync_RecipientDisabledCategory_ReceivesNothing()
        {
            var (context, userId) = await SeedHrAdminAsync();
            context.NotificationPreferences.Add(new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Category = NotificationCategory.AiScreening,
                IsEnabled = false,
            });
            await context.SaveChangesAsync();

            var service = CreateService(context);
            await service.NotifyAsync(NotificationType.AiScreeningFailed, SampleContext(), "key-1", CancellationToken.None);

            var count = await context.Notifications.CountAsync(n => n.RecipientUserId == userId);
            count.Should().Be(0, "a user who turned off AiScreening notifications should not receive one");
        }

        [Fact]
        public async Task NotifyAsync_JobPostUpdates_DefaultsToOff_WhenPreferenceUntouched()
        {
            var (context, userId) = await SeedHrAdminAsync();
            var service = CreateService(context);

            await service.NotifyAsync(NotificationType.JobPostUpdated, SampleContext(), "job-1", CancellationToken.None);

            var count = await context.Notifications.CountAsync(n => n.RecipientUserId == userId);
            count.Should().Be(0, "JobPostUpdates defaults to off for a user with no stored preference row");
        }

        [Fact]
        public async Task NotifyAsync_JobPostUpdates_SendsOnce_WhenExplicitlyEnabled()
        {
            var (context, userId) = await SeedHrAdminAsync();
            context.NotificationPreferences.Add(new NotificationPreference
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Category = NotificationCategory.JobPostUpdates,
                IsEnabled = true,
            });
            await context.SaveChangesAsync();

            var service = CreateService(context);
            await service.NotifyAsync(NotificationType.JobPostUpdated, SampleContext(), "job-2", CancellationToken.None);

            var count = await context.Notifications.CountAsync(n => n.RecipientUserId == userId);
            count.Should().Be(1);
        }

        [Fact]
        public async Task NotifyAsync_NeverThrows_WhenCancellationTokenIsAlreadyCancelled()
        {
            var (context, userId) = await SeedHrAdminAsync();
            var service = CreateService(context);

            var act = async () => await service.NotifyAsync(
                NotificationType.AiScreeningPassed, SampleContext(), "cancelled-key", new CancellationToken(canceled: true));

            await act.Should().NotThrowAsync("a notification failure must never fail the caller's own operation");

            var count = await context.Notifications.CountAsync(n => n.RecipientUserId == userId);
            count.Should().Be(0);
        }

        [Fact]
        public async Task GetUnreadCountAsync_CountsOnlyUnreadForThatUser()
        {
            var (context, userId) = await SeedHrAdminAsync();
            context.Notifications.AddRange(
                MakeNotification(userId, isRead: false),
                MakeNotification(userId, isRead: false),
                MakeNotification(userId, isRead: true));
            await context.SaveChangesAsync();

            var service = CreateService(context);
            var count = await service.GetUnreadCountAsync(userId, CancellationToken.None);

            count.Should().Be(2);
        }

        [Fact]
        public async Task MarkAsReadAsync_SetsIsReadAndReadAt_AndReturnsFalseForWrongUser()
        {
            var (context, userId) = await SeedHrAdminAsync();
            var notification = MakeNotification(userId, isRead: false);
            context.Notifications.Add(notification);
            await context.SaveChangesAsync();

            var service = CreateService(context);

            var successResult = await service.MarkAsReadAsync(userId, notification.Id, CancellationToken.None);
            successResult.Should().BeTrue();

            var updated = await context.Notifications.AsNoTracking().SingleAsync(n => n.Id == notification.Id);
            updated.IsRead.Should().BeTrue();
            updated.ReadAt.Should().NotBeNull();

            var wrongUserResult = await service.MarkAsReadAsync(Guid.NewGuid(), notification.Id, CancellationToken.None);
            wrongUserResult.Should().BeFalse("a notification belongs only to its recipient");
        }

        [Fact]
        public async Task MarkAllAsReadAsync_OnlyAffectsCallingUsersNotifications()
        {
            var (context, userId) = await SeedHrAdminAsync();
            var otherUserId = await AddSecondHrAdminAsync(context);

            context.Notifications.AddRange(
                MakeNotification(userId, isRead: false),
                MakeNotification(userId, isRead: false),
                MakeNotification(otherUserId, isRead: false));
            await context.SaveChangesAsync();

            var service = CreateService(context);
            var updatedCount = await service.MarkAllAsReadAsync(userId, CancellationToken.None);

            updatedCount.Should().Be(2);

            var otherUserNotification = await context.Notifications.AsNoTracking().SingleAsync(n => n.RecipientUserId == otherUserId);
            otherUserNotification.IsRead.Should().BeFalse("read-all must never touch another user's notifications");
        }

        [Fact]
        public async Task GetNotificationsAsync_PaginatesNewestFirst_WithTotalCount()
        {
            var (context, userId) = await SeedHrAdminAsync();

            for (var i = 0; i < 5; i++)
            {
                context.Notifications.Add(MakeNotification(userId, isRead: false, createdAt: DateTime.UtcNow.AddMinutes(-i)));
            }
            await context.SaveChangesAsync();

            var service = CreateService(context);
            var (items, totalCount) = await service.GetNotificationsAsync(userId, page: 1, pageSize: 2, unreadOnly: false, CancellationToken.None);

            totalCount.Should().Be(5);
            items.Should().HaveCount(2);
            items[0].CreatedAt.Should().BeAfter(items[1].CreatedAt, "results must be newest first");
        }

        private static Notification MakeNotification(Guid recipientId, bool isRead, DateTime? createdAt = null) => new()
        {
            Id = Guid.NewGuid(),
            RecipientUserId = recipientId,
            Type = NotificationType.SystemNotice,
            Category = NotificationCategory.System,
            Severity = NotificationSeverity.Info,
            Title = "Title",
            Message = "Message",
            IsRead = isRead,
            ReadAt = isRead ? DateTime.UtcNow : null,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            DeduplicationKey = Guid.NewGuid().ToString(),
        };
    }
}
