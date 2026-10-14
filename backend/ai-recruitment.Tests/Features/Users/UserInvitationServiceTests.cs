using ai_recruitment.Data;
using ai_recruitment.Features.Users;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;
using ai_recruitment.Features.Users.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Users
{
    // Records every call instead of actually sending anything, and lets each test choose
    // whether "delivery" succeeds or fails.
    public class FakeInvitationEmailService : IInvitationEmailService
    {
        public bool ShouldSucceed { get; set; } = true;
        public List<(User User, string RawToken)> Calls { get; } = new();

        public Task<bool> SendInvitationEmailAsync(User user, string rawToken, CancellationToken cancellationToken = default)
        {
            Calls.Add((user, rawToken));
            return Task.FromResult(ShouldSucceed);
        }
    }

    public class UserInvitationServiceTests
    {
        private static AppDbContext CreateContext(string? dbName = null)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static async Task<User> AddPendingUserAsync(AppDbContext context)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                FirstName = "Pending",
                LastName = "User",
                Email = $"pending-{Guid.NewGuid()}@example.com",
                PasswordHash = string.Empty,
                InsertedBy = "tester",
                PhoneNumber = "09171234567",
                EmployeeNumber = "EMP-TEST01",
                RoleId = 3,
                PasswordSetupCompletedAt = null,
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();
            return user;
        }

        private static UserInvitationService CreateService(AppDbContext context, FakeInvitationEmailService? email = null) =>
            new(context, email ?? new FakeInvitationEmailService(), new CommonPasswordChecker());

        [Fact]
        public async Task IssueInvitationAsync_CreatesInvitation_AndSendsEmail_WhenDeliverySucceeds()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService { ShouldSucceed = true };
            var service = CreateService(context, email);

            var delivered = await service.IssueInvitationAsync(user);

            delivered.Should().BeTrue();
            email.Calls.Should().ContainSingle(c => c.User.Id == user.Id);

            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.DeliveryStatus.Should().Be(InvitationDeliveryStatus.Sent);
            invitation.TokenHash.Should().NotBe(email.Calls[0].RawToken, "only the hash is persisted, never the raw token");
            invitation.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(24), TimeSpan.FromMinutes(1));
        }

        [Fact]
        public async Task IssueInvitationAsync_TracksFailedDelivery_WithoutLosingTheInvitation()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService { ShouldSucceed = false };
            var service = CreateService(context, email);

            var delivered = await service.IssueInvitationAsync(user);

            delivered.Should().BeFalse();

            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.DeliveryStatus.Should().Be(InvitationDeliveryStatus.Failed);
            invitation.IsUsable(DateTime.UtcNow).Should().BeTrue("a failed email send must still leave a retryable, valid invitation");
        }

        [Fact]
        public async Task IssueInvitationAsync_InvalidatesPreviouslyIssuedUsableInvitation()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var service = CreateService(context);

            await service.IssueInvitationAsync(user);
            var first = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);

            await service.IssueInvitationAsync(user);

            var reloadedFirst = await context.UserInvitations.FirstAsync(i => i.Id == first.Id);
            reloadedFirst.InvalidatedAt.Should().NotBeNull();

            var usableCount = await context.UserInvitations.CountAsync(i => i.UserId == user.Id && i.InvalidatedAt == null);
            usableCount.Should().Be(1);
        }

        [Fact]
        public async Task ValidateInvitationAsync_ReturnsInvalid_ForUnknownToken()
        {
            await using var context = CreateContext();
            var service = CreateService(context);

            var result = await service.ValidateInvitationAsync("not-a-real-token");

            result.IsValid.Should().BeFalse();
            result.Email.Should().BeNull();
        }

        [Fact]
        public async Task ValidateInvitationAsync_ReturnsInvalid_ForExpiredToken()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var rawToken = InvitationTokenGenerator.GenerateToken();
            context.UserInvitations.Add(new UserInvitation
            {
                UserId = user.Id,
                TokenHash = InvitationTokenGenerator.Hash(rawToken),
                CreatedAt = DateTime.UtcNow.AddHours(-25),
                ExpiresAt = DateTime.UtcNow.AddHours(-1),
            });
            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.ValidateInvitationAsync(rawToken);

            result.IsValid.Should().BeFalse();
        }

        [Fact]
        public async Task ValidateInvitationAsync_ReturnsValid_ForUsableToken()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService();
            var service = CreateService(context, email);
            await service.IssueInvitationAsync(user);

            var rawToken = email.Calls[0].RawToken;
            var result = await service.ValidateInvitationAsync(rawToken);

            result.IsValid.Should().BeTrue();
            result.Email.Should().Be(user.Email);
            result.ExpiresAt.Should().NotBeNull();
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Succeeds_ConsumesToken_AndActivatesUser()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService();
            var service = CreateService(context, email);
            await service.IssueInvitationAsync(user);
            var rawToken = email.Calls[0].RawToken;

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = rawToken,
                NewPassword = "MyUniquePhrase2026!",
                ConfirmPassword = "MyUniquePhrase2026!",
            });

            result.Succeeded.Should().BeTrue();

            var reloadedUser = await context.Users.SingleAsync(u => u.Id == user.Id);
            reloadedUser.PasswordHash.Should().NotBeNullOrEmpty();
            reloadedUser.PasswordSetupCompletedAt.Should().NotBeNull();

            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.ConsumedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_WhenPasswordsDoNotMatch()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService();
            var service = CreateService(context, email);
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = email.Calls[0].RawToken,
                NewPassword = "MyUniquePhrase2026!",
                ConfirmPassword = "SomethingElse!",
            });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(SetInitialPasswordOutcome.PasswordMismatch);
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_ForCommonPassword()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService();
            var service = CreateService(context, email);
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = email.Calls[0].RawToken,
                NewPassword = "password123",
                ConfirmPassword = "password123",
            });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(SetInitialPasswordOutcome.WeakPassword);
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_ForExpiredToken()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var rawToken = InvitationTokenGenerator.GenerateToken();
            context.UserInvitations.Add(new UserInvitation
            {
                UserId = user.Id,
                TokenHash = InvitationTokenGenerator.Hash(rawToken),
                CreatedAt = DateTime.UtcNow.AddHours(-25),
                ExpiresAt = DateTime.UtcNow.AddHours(-1),
            });
            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = rawToken,
                NewPassword = "MyUniquePhrase2026!",
                ConfirmPassword = "MyUniquePhrase2026!",
            });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(SetInitialPasswordOutcome.InvalidOrExpiredToken);
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_WhenTokenAlreadyConsumed()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var email = new FakeInvitationEmailService();
            var service = CreateService(context, email);
            await service.IssueInvitationAsync(user);
            var rawToken = email.Calls[0].RawToken;

            var dto = new SetInitialPasswordDto
            {
                Token = rawToken,
                NewPassword = "MyUniquePhrase2026!",
                ConfirmPassword = "MyUniquePhrase2026!",
            };

            var first = await service.SetInitialPasswordAsync(dto);
            first.Succeeded.Should().BeTrue();

            var second = await service.SetInitialPasswordAsync(dto);

            second.Succeeded.Should().BeFalse();
            second.Outcome.Should().Be(SetInitialPasswordOutcome.InvalidOrExpiredToken);
        }

        [Fact]
        public async Task SetInitialPasswordAsync_ConcurrentRedemption_OnlyOneRequestSucceeds()
        {
            var dbName = Guid.NewGuid().ToString();
            await using var setupContext = CreateContext(dbName);
            var user = await AddPendingUserAsync(setupContext);
            var email = new FakeInvitationEmailService();
            var setupService = CreateService(setupContext, email);
            await setupService.IssueInvitationAsync(user);
            var rawToken = email.Calls[0].RawToken;

            var dto = new SetInitialPasswordDto
            {
                Token = rawToken,
                NewPassword = "MyUniquePhrase2026!",
                ConfirmPassword = "MyUniquePhrase2026!",
            };

            // Two separate DbContext instances against the same in-memory database,
            // simulating two concurrent HTTP requests racing to redeem the same token.
            await using var contextA = CreateContext(dbName);
            await using var contextB = CreateContext(dbName);
            var serviceA = CreateService(contextA);
            var serviceB = CreateService(contextB);

            var resultA = await serviceA.SetInitialPasswordAsync(dto);
            var resultB = await serviceB.SetInitialPasswordAsync(dto);

            var successes = new[] { resultA.Succeeded, resultB.Succeeded }.Count(s => s);
            successes.Should().Be(1, "exactly one of the two racing requests must win");
        }

        [Fact]
        public async Task ResendInvitationAsync_Fails_WhenUserNotFound()
        {
            await using var context = CreateContext();
            var service = CreateService(context);

            var result = await service.ResendInvitationAsync(Guid.NewGuid());

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(ResendInvitationOutcome.UserNotFound);
        }

        [Fact]
        public async Task ResendInvitationAsync_Fails_WhenUserAlreadyActivated()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            user.PasswordSetupCompletedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();

            var service = CreateService(context);
            var result = await service.ResendInvitationAsync(user.Id);

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(ResendInvitationOutcome.UserNotPendingActivation);
        }

        [Fact]
        public async Task ResendInvitationAsync_Succeeds_ForPendingUser()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var service = CreateService(context);

            var result = await service.ResendInvitationAsync(user.Id);

            result.Succeeded.Should().BeTrue();
            result.InvitationEmailSent.Should().BeTrue();
        }
    }
}
