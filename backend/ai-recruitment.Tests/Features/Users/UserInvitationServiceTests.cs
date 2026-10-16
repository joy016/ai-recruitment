using ai_recruitment.Data;
using ai_recruitment.Features.Users;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.Users
{
    public class UserInvitationServiceTests
    {
        private const string ValidPassword = "MyUniquePhrase2026!";

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

        private static UserInvitationService CreateService(AppDbContext context, FakeInvitationWebhookService? webhook = null) =>
            new(context, webhook ?? new FakeInvitationWebhookService(), new CommonPasswordChecker());

        [Fact]
        public async Task IssueInvitationAsync_CreatesInvitation_AndPublishesWebhook_WhenDeliverySucceeds()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService { ShouldSucceed = true };
            var service = CreateService(context, webhook);

            var delivered = await service.IssueInvitationAsync(user);

            delivered.Should().BeTrue();
            webhook.Calls.Should().ContainSingle(c => c.User.Id == user.Id);

            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.DeliveryStatus.Should().Be(InvitationDeliveryStatus.Sent);
            invitation.TokenHash.Should().NotBe(webhook.Calls[0].RawToken, "only the hash is persisted, never the raw token");
            invitation.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(24), TimeSpan.FromMinutes(1));

            // The webhook is handed the row's own id so n8n can deduplicate retries.
            webhook.Calls[0].InvitationId.Should().Be(invitation.Id);
            webhook.Calls[0].ExpiresAt.Should().Be(invitation.ExpiresAt);
        }

        [Fact]
        public async Task IssueInvitationAsync_TracksFailedDelivery_WithoutLosingTheInvitation()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService { ShouldSucceed = false };
            var service = CreateService(context, webhook);

            var delivered = await service.IssueInvitationAsync(user);

            delivered.Should().BeFalse();

            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.DeliveryStatus.Should().Be(InvitationDeliveryStatus.Failed);
            invitation.DeliveryError.Should().NotBeNullOrEmpty();
            invitation.IsUsable(DateTime.UtcNow).Should().BeTrue("a failed webhook must still leave a retryable, valid invitation");
        }

        [Fact]
        public async Task IssueInvitationAsync_WebhookFailure_LeavesUserPendingAndCreatesNoDuplicateUser()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService { ShouldSucceed = false };
            var service = CreateService(context, webhook);

            await service.IssueInvitationAsync(user);

            var reloaded = await context.Users.SingleAsync(u => u.Id == user.Id);
            reloaded.PasswordSetupCompletedAt.Should().BeNull("delivery failure must not activate the account");
            reloaded.PasswordHash.Should().BeEmpty();
            (await context.Users.CountAsync()).Should().Be(1);
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
            result.Message.Should().NotBeNullOrEmpty();
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
        public async Task ValidateInvitationAsync_ReturnsInvalid_ForRevokedToken()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);

            await service.IssueInvitationAsync(user);
            var supersededToken = webhook.Calls[0].RawToken;

            // Issuing a fresh invitation revokes the first one.
            await service.IssueInvitationAsync(user);

            var result = await service.ValidateInvitationAsync(supersededToken);

            result.IsValid.Should().BeFalse();
        }

        [Fact]
        public async Task ValidateInvitationAsync_ReturnsInvalid_WhenUserHasAlreadyActivated()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            user.PasswordSetupCompletedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();

            var result = await service.ValidateInvitationAsync(webhook.Calls[0].RawToken);

            result.IsValid.Should().BeFalse();
            result.Email.Should().BeNull();
        }

        [Fact]
        public async Task ValidateInvitationAsync_ReturnsValid_ForUsableToken()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            var result = await service.ValidateInvitationAsync(webhook.Calls[0].RawToken);

            result.IsValid.Should().BeTrue();
            result.Email.Should().Be(user.Email);
            result.ExpiresAt.Should().NotBeNull();
            result.Message.Should().Be("Invitation is valid.");
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Succeeds_ConsumesToken_AndActivatesUser()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = webhook.Calls[0].RawToken,
                NewPassword = ValidPassword,
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
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = webhook.Calls[0].RawToken,
                NewPassword = ValidPassword,
                ConfirmPassword = "SomethingElse1!",
            });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(SetInitialPasswordOutcome.PasswordMismatch);
        }

        // One case per complexity rule in PasswordPolicy.
        [Theory]
        [InlineData("Ab1!x", "shorter than 8 characters")]
        [InlineData("alllowercase1!", "no uppercase letter")]
        [InlineData("ALLUPPERCASE1!", "no lowercase letter")]
        [InlineData("NoDigitsHere!", "no number")]
        [InlineData("NoSpecial1234", "no special character")]
        public async Task SetInitialPasswordAsync_Fails_WhenComplexityRulesAreNotMet(string password, string reason)
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = webhook.Calls[0].RawToken,
                NewPassword = password,
            });

            result.Succeeded.Should().BeFalse(reason);
            result.Outcome.Should().Be(SetInitialPasswordOutcome.PasswordRequirementsNotMet);

            // A rejected password must not consume the one-time token.
            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.ConsumedAt.Should().BeNull();
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_ForCommonPassword()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = webhook.Calls[0].RawToken,
                // On the denylist, yet complex enough to get past PasswordPolicy.
                NewPassword = "P@ssw0rd",
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
                NewPassword = ValidPassword,
            });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(SetInitialPasswordOutcome.InvalidOrExpiredToken);
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_ForRevokedToken()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);

            await service.IssueInvitationAsync(user);
            var supersededToken = webhook.Calls[0].RawToken;
            await service.IssueInvitationAsync(user);

            var result = await service.SetInitialPasswordAsync(new SetInitialPasswordDto
            {
                Token = supersededToken,
                NewPassword = ValidPassword,
            });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(SetInitialPasswordOutcome.InvalidOrExpiredToken);
        }

        [Fact]
        public async Task SetInitialPasswordAsync_Fails_WhenTokenAlreadyConsumed()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            await service.IssueInvitationAsync(user);

            var dto = new SetInitialPasswordDto
            {
                Token = webhook.Calls[0].RawToken,
                NewPassword = ValidPassword,
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
            var webhook = new FakeInvitationWebhookService();
            var setupService = CreateService(setupContext, webhook);
            await setupService.IssueInvitationAsync(user);

            var dto = new SetInitialPasswordDto
            {
                Token = webhook.Calls[0].RawToken,
                NewPassword = ValidPassword,
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

            var webhook = new FakeInvitationWebhookService();
            var service = CreateService(context, webhook);
            var result = await service.ResendInvitationAsync(user.Id);

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(ResendInvitationOutcome.UserNotPendingActivation);
            webhook.Calls.Should().BeEmpty("an already-activated account must never be re-onboarded");
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

        [Fact]
        public async Task ResendInvitationAsync_ReportsFailure_ButStillIssuesAUsableInvitation()
        {
            await using var context = CreateContext();
            var user = await AddPendingUserAsync(context);
            var webhook = new FakeInvitationWebhookService { ShouldSucceed = false };
            var service = CreateService(context, webhook);

            var result = await service.ResendInvitationAsync(user.Id);

            result.Succeeded.Should().BeTrue();
            result.InvitationEmailSent.Should().BeFalse();

            var invitation = await context.UserInvitations.SingleAsync(i => i.UserId == user.Id);
            invitation.IsUsable(DateTime.UtcNow).Should().BeTrue();
        }
    }
}
