using ai_recruitment.Data;
using ai_recruitment.Features.Notifications.Dto;
using ai_recruitment.Features.Notifications.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Notifications
{
    public class PreferenceServiceTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetPreferencesAsync_NewUser_ReturnsAllCategoriesWithDefaults()
        {
            await using var context = CreateContext();
            var service = new PreferenceService(context);

            var preferences = await service.GetPreferencesAsync(Guid.NewGuid(), CancellationToken.None);

            preferences.Should().HaveCount(8);
            preferences.Single(p => p.Category == "JobPostUpdates").IsEnabled.Should().BeFalse("Job Post Updates defaults to off");
            preferences.Where(p => p.Category != "JobPostUpdates").Should().OnlyContain(p => p.IsEnabled, "every other category defaults to on");
        }

        [Fact]
        public async Task UpdatePreferencesAsync_UpsertsAndPersists()
        {
            await using var context = CreateContext();
            var service = new PreferenceService(context);
            var userId = Guid.NewGuid();

            var afterFirstUpdate = await service.UpdatePreferencesAsync(
                userId,
                new List<UpdateNotificationPreferenceDto>
                {
                    new() { Category = "JobPostUpdates", IsEnabled = true },
                    new() { Category = "System", IsEnabled = false },
                },
                CancellationToken.None);

            afterFirstUpdate.Single(p => p.Category == "JobPostUpdates").IsEnabled.Should().BeTrue();
            afterFirstUpdate.Single(p => p.Category == "System").IsEnabled.Should().BeFalse();

            // Flip the same category again - should update the existing row, not add a second one.
            await service.UpdatePreferencesAsync(
                userId,
                new List<UpdateNotificationPreferenceDto> { new() { Category = "JobPostUpdates", IsEnabled = false } },
                CancellationToken.None);

            var storedRows = await context.NotificationPreferences.Where(p => p.UserId == userId).ToListAsync();
            storedRows.Should().HaveCount(2, "upserting an already-stored category must update it, not insert a duplicate");

            var fetched = await service.GetPreferencesAsync(userId, CancellationToken.None);
            fetched.Single(p => p.Category == "JobPostUpdates").IsEnabled.Should().BeFalse();
        }

        [Fact]
        public async Task UpdatePreferencesAsync_UnknownCategory_ThrowsArgumentException()
        {
            await using var context = CreateContext();
            var service = new PreferenceService(context);

            var act = async () => await service.UpdatePreferencesAsync(
                Guid.NewGuid(),
                new List<UpdateNotificationPreferenceDto> { new() { Category = "NotACategory", IsEnabled = true } },
                CancellationToken.None);

            await act.Should().ThrowAsync<ArgumentException>();
        }
    }
}
