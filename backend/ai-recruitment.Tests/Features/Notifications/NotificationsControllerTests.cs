using System.Security.Claims;
using ai_recruitment.Data;
using ai_recruitment.Features.Notifications.Controller;
using ai_recruitment.Features.Notifications.Dto;
using ai_recruitment.Features.Notifications.Model;
using ai_recruitment.Features.Notifications.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ai_recruitment.Tests.Features.Notifications
{
    public class NotificationsControllerTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static NotificationsController CreateController(AppDbContext context, Guid userId)
        {
            var controller = new NotificationsController(
                new NotificationService(context, NullLogger<NotificationService>.Instance),
                new PreferenceService(context));

            var user = new ClaimsPrincipal(new ClaimsIdentity(
                new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) },
                authenticationType: "TestAuth"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user },
            };

            return controller;
        }

        [Fact]
        public async Task GetUnreadCount_ReturnsCountForCallingUserOnly()
        {
            await using var context = CreateContext();
            var userId = Guid.NewGuid();
            var otherUserId = Guid.NewGuid();

            context.Notifications.AddRange(
                MakeNotification(userId, isRead: false),
                MakeNotification(otherUserId, isRead: false),
                MakeNotification(otherUserId, isRead: false));
            await context.SaveChangesAsync();

            var controller = CreateController(context, userId);

            var result = await controller.GetUnreadCount(CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value!.GetType().GetProperty("unreadCount")!.GetValue(okResult.Value).Should().Be(1);
        }

        [Fact]
        public async Task MarkAsRead_UnknownNotification_ReturnsNotFound()
        {
            await using var context = CreateContext();
            var controller = CreateController(context, Guid.NewGuid());

            var result = await controller.MarkAsRead(Guid.NewGuid(), CancellationToken.None);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task UpdatePreferences_EmptyList_ReturnsBadRequest()
        {
            await using var context = CreateContext();
            var controller = CreateController(context, Guid.NewGuid());

            var result = await controller.UpdatePreferences(new List<UpdateNotificationPreferenceDto>(), CancellationToken.None);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdatePreferences_UnknownCategory_ReturnsBadRequest()
        {
            await using var context = CreateContext();
            var controller = CreateController(context, Guid.NewGuid());

            var result = await controller.UpdatePreferences(
                new List<UpdateNotificationPreferenceDto> { new() { Category = "NotReal", IsEnabled = true } },
                CancellationToken.None);

            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetPreferences_ReturnsDefaultsForNewUser()
        {
            await using var context = CreateContext();
            var controller = CreateController(context, Guid.NewGuid());

            var result = await controller.GetPreferences(CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var preferences = okResult.Value.Should().BeAssignableTo<IReadOnlyList<NotificationPreferenceDto>>().Subject;
            preferences.Should().HaveCount(8);
        }

        private static Notification MakeNotification(Guid recipientId, bool isRead) => new()
        {
            Id = Guid.NewGuid(),
            RecipientUserId = recipientId,
            Type = NotificationType.SystemNotice,
            Category = NotificationCategory.System,
            Severity = NotificationSeverity.Info,
            Title = "Title",
            Message = "Message",
            IsRead = isRead,
            CreatedAt = DateTime.UtcNow,
            DeduplicationKey = Guid.NewGuid().ToString(),
        };
    }
}
