using ai_recruitment.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Users
{
    // Guards the "do not break existing accounts" requirement: the invitation flow must
    // never be applied retroactively to the seeded Super Admin.
    public class SeededSuperAdminCompatibilityTests
    {
        private static readonly Guid SuperAdminId = new("11111111-1111-1111-1111-111111111111");

        private static AppDbContext CreateSeededContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            // Applies the model's HasData seed, including the Super Admin row.
            context.Database.EnsureCreated();
            return context;
        }

        [Fact]
        public async Task SeededSuperAdmin_IsPreActivated_WithItsOriginalPasswordHash()
        {
            await using var context = CreateSeededContext();

            var admin = await context.Users.SingleAsync(u => u.Id == SuperAdminId);

            admin.Email.Should().Be("joy.developer@ai-recruitment.local");
            admin.IsActive.Should().BeTrue("the seeded account must never be deactivated by the invitation feature");
            admin.PasswordHash.Should().NotBeNullOrEmpty("the existing password must be left untouched");
            admin.PasswordSetupCompletedAt.Should().NotBeNull("a pre-existing account is already activated and must still be able to log in");
        }

        [Fact]
        public async Task SeededSuperAdmin_HasNoInvitation()
        {
            await using var context = CreateSeededContext();

            var invitations = await context.UserInvitations.CountAsync(i => i.UserId == SuperAdminId);

            invitations.Should().Be(0, "no invitation token is ever generated for the seeded Super Admin");
        }
    }
}
