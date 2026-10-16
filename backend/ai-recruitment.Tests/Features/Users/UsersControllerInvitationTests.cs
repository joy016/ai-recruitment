using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Users;
using ai_recruitment.Features.Users.Controller;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Service;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Users
{
    public class FakeSupabaseStorageService : ISupabaseStorageService
    {
        public Task<string> UploadAsync(string bucket, string path, Stream content, string contentType) =>
            Task.FromResult($"https://fake-storage.local/{bucket}/{path}");
    }

    public class UsersControllerInvitationTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static async Task<AppDbContext> SeedRoleAsync()
        {
            var context = CreateContext();
            context.Roles.Add(new ai_recruitment.Features.Roles.Model.Role
            {
                RoleId = 3,
                RoleName = "Recruiter",
                ChipColor = "#000",
                BackgroundColor = "#fff",
            });
            await context.SaveChangesAsync();
            return context;
        }

        private static UsersController CreateController(AppDbContext context, FakeInvitationWebhookService? webhook = null) =>
            new(context, new FakeSupabaseStorageService(), new UserInvitationService(context, webhook ?? new FakeInvitationWebhookService(), new CommonPasswordChecker()));

        [Fact]
        public async Task InsertUser_CreatesPendingAccount_AndIssuesInvitation_WithoutAcceptingAPassword()
        {
            await using var context = await SeedRoleAsync();
            var webhook = new FakeInvitationWebhookService();
            var controller = CreateController(context, webhook);

            var result = await controller.InsertUser(new CreateUserDto
            {
                FirstName = "New",
                LastName = "Hire",
                Email = "new.hire@example.com",
                InsertedBy = "admin@example.com",
                RoleId = 3,
            });

            result.Should().BeOfType<OkObjectResult>();

            var user = await context.Users.SingleAsync(u => u.Email == "new.hire@example.com");
            user.PasswordHash.Should().BeEmpty("no password is accepted or generated at creation time");
            user.PasswordSetupCompletedAt.Should().BeNull();

            webhook.Calls.Should().ContainSingle(c => c.User.Id == user.Id);
        }

        [Fact]
        public async Task InsertUser_RejectsDuplicateEmail()
        {
            await using var context = await SeedRoleAsync();
            var controller = CreateController(context);

            var dto = new CreateUserDto
            {
                FirstName = "First",
                LastName = "User",
                Email = "duplicate@example.com",
                InsertedBy = "admin@example.com",
                RoleId = 3,
            };

            var firstResult = await controller.InsertUser(dto);
            firstResult.Should().BeOfType<OkObjectResult>();

            var secondResult = await controller.InsertUser(new CreateUserDto
            {
                FirstName = "Second",
                LastName = dto.LastName,
                Email = dto.Email,
                InsertedBy = dto.InsertedBy,
                RoleId = dto.RoleId,
            });

            secondResult.Should().BeOfType<ConflictObjectResult>();
        }

        [Theory]
        [InlineData(nameof(UsersController.InsertUser))]
        [InlineData(nameof(UsersController.ResendInvitation))]
        public void AccountManagementEndpoints_RequireAccountsManagePermission(string methodName)
        {
            var method = typeof(UsersController).GetMethod(methodName);
            method.Should().NotBeNull();

            var attribute = method!.GetCustomAttributes(typeof(HasPermissionAttribute), inherit: false)
                .Cast<AuthorizeAttribute>()
                .SingleOrDefault();

            attribute.Should().NotBeNull("creating or resending invitations must require administrative permission");
            attribute!.Policy.Should().Be(PermissionPolicyProvider.PolicyPrefix + PermissionNames.Accounts.Manage);
        }

        [Theory]
        [InlineData(nameof(UsersController.ValidateInvitation))]
        [InlineData(nameof(UsersController.ValidateInvitationFromBody))]
        [InlineData(nameof(UsersController.SetInvitationPassword))]
        public void PublicInvitationEndpoints_AllowAnonymousAccess(string methodName)
        {
            var method = typeof(UsersController).GetMethod(methodName);
            method.Should().NotBeNull();

            method!.GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: false)
                .Should().ContainSingle("the set-password page must reach these endpoints without a JWT");
        }
    }
}
