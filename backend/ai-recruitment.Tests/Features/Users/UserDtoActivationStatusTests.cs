using ai_recruitment.Data;
using ai_recruitment.Features.Users;
using ai_recruitment.Features.Users.Controller;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Users
{
    // Guards the UserDto.IsPendingActivation contract: it must track
    // PasswordSetupCompletedAt independently of IsActive, for both the list and
    // single-user read endpoints the Accounts UI relies on.
    public class UserDtoActivationStatusTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static UsersController CreateController(AppDbContext context) =>
            new(context, new FakeSupabaseStorageService(),
                new UserInvitationService(context, new FakeInvitationWebhookService(), new CommonPasswordChecker(), NullLogger<UserInvitationService>.Instance),
                NullLogger<UsersController>.Instance);

        private static async Task<AppDbContext> SeedRoleAndUsersAsync()
        {
            var context = CreateContext();
            context.Roles.Add(new ai_recruitment.Features.Roles.Model.Role
            {
                RoleId = 3,
                RoleName = "Recruiter",
                ChipColor = "#000",
                BackgroundColor = "#fff",
            });

            context.Users.AddRange(
                new User
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Pending",
                    LastName = "User",
                    Email = "pending.user@example.com",
                    PasswordHash = string.Empty,
                    InsertedBy = "admin@example.com",
                    RoleId = 3,
                    PasswordSetupCompletedAt = null,
                },
                new User
                {
                    Id = Guid.NewGuid(),
                    FirstName = "Activated",
                    LastName = "User",
                    Email = "activated.user@example.com",
                    PasswordHash = "hashed",
                    InsertedBy = "admin@example.com",
                    RoleId = 3,
                    PasswordSetupCompletedAt = DateTime.UtcNow,
                });

            await context.SaveChangesAsync();
            return context;
        }

        [Fact]
        public async Task GetAllUsers_ReportsIsPendingActivation_PerUser()
        {
            await using var context = await SeedRoleAndUsersAsync();
            var controller = CreateController(context);

            var result = await controller.GetAllUsers(roleId: null, status: null, pageNumber: 1, pageSize: 10);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            var data = ok.Value!.GetType().GetProperty("data")!.GetValue(ok.Value) as IEnumerable<UserDto>;
            data.Should().NotBeNull();

            var pending = data!.Single(u => u.Email == "pending.user@example.com");
            var activated = data!.Single(u => u.Email == "activated.user@example.com");

            pending.IsPendingActivation.Should().BeTrue("the user has not completed initial password setup");
            activated.IsPendingActivation.Should().BeFalse("the user already completed initial password setup");
        }

        [Fact]
        public async Task GetUser_ReportsIsPendingActivation_IndependentlyOfIsActive()
        {
            await using var context = await SeedRoleAndUsersAsync();
            var controller = CreateController(context);
            var pendingUser = await context.Users.SingleAsync(u => u.Email == "pending.user@example.com");

            // A pending user can still be flagged inactive by an admin - the two flags must
            // not be conflated.
            pendingUser.IsActive = false;
            await context.SaveChangesAsync();

            var result = await controller.GetUser(pendingUser.Id);

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            var dto = ok.Value.Should().BeOfType<UserDto>().Subject;

            dto.IsActive.Should().BeFalse();
            dto.IsPendingActivation.Should().BeTrue("deactivating the account must not affect its pending-activation status");
        }
    }
}
