using ai_recruitment.Data;
using ai_recruitment.Features.Authentication.Controller;
using ai_recruitment.Features.Authentication.Dto;
using ai_recruitment.Features.Roles.Model;
using ai_recruitment.Features.Users.Model;
using ai_recruitment.Service;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Authentication
{
    public class FakeTokenService : ITokenService
    {
        public string GenerateToken(string userId, string username, IEnumerable<string> roles, out DateTime expiresAt)
        {
            expiresAt = DateTime.UtcNow.AddMinutes(15);
            return "fake-jwt-token";
        }
    }

    // Covers "login blocked before activation" / "login allowed after activation" from the
    // invitation-based account activation feature: a pending user must never authenticate,
    // even though IsActive stays true (that flag is the separate admin enable/disable toggle).
    public class AuthControllerInvitationTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static async Task<User> SeedRoleAndUserAsync(AppDbContext context, bool activated)
        {
            context.Roles.Add(new Role { RoleId = 3, RoleName = "Recruiter", ChipColor = "#000", BackgroundColor = "#fff" });

            var user = new User
            {
                Id = Guid.NewGuid(),
                FirstName = "Jane",
                LastName = "Doe",
                Email = "jane.doe@example.com",
                PasswordHash = activated ? new PasswordHasher<User>().HashPassword(null!, "CorrectHorse123!") : string.Empty,
                InsertedBy = "tester",
                PhoneNumber = "09171234567",
                EmployeeNumber = "EMP-TEST02",
                RoleId = 3,
                IsActive = true,
                PasswordSetupCompletedAt = activated ? DateTime.UtcNow : null,
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();
            return user;
        }

        [Fact]
        public async Task Login_RejectsPendingActivationUser_EvenWhenIsActiveIsTrue()
        {
            await using var context = CreateContext();
            var user = await SeedRoleAndUserAsync(context, activated: false);
            var controller = new AuthController(context, new FakeTokenService());

            var result = await controller.Login(new LoginDto { Email = user.Email, Password = "CorrectHorse123!" });

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task Login_AllowsActivatedUser_WithCorrectPassword()
        {
            await using var context = CreateContext();
            var user = await SeedRoleAndUserAsync(context, activated: true);
            var controller = new AuthController(context, new FakeTokenService());

            var result = await controller.Login(new LoginDto { Email = user.Email, Password = "CorrectHorse123!" });

            result.Should().BeOfType<OkObjectResult>();
        }
    }
}
