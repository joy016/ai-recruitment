using ai_recruitment.Data;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;
using ai_recruitment.Features.Users.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ai_recruitment.Features.Users
{
    public class UserInvitationService : IUserInvitationService
    {
        private static readonly TimeSpan InvitationLifetime = TimeSpan.FromHours(24);

        private readonly AppDbContext _context;
        private readonly IInvitationWebhookService _invitationWebhook;
        private readonly IWeakPasswordChecker _weakPasswordChecker;
        private readonly ILogger<UserInvitationService> _logger;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public UserInvitationService(
            AppDbContext context,
            IInvitationWebhookService invitationWebhook,
            IWeakPasswordChecker weakPasswordChecker,
            ILogger<UserInvitationService> logger)
        {
            _context = context;
            _invitationWebhook = invitationWebhook;
            _weakPasswordChecker = weakPasswordChecker;
            _logger = logger;
        }

        public async Task<bool> IssueInvitationAsync(User user, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            var priorUsable = await _context.UserInvitations
                .Where(i => i.UserId == user.Id && i.ConsumedAt == null && i.InvalidatedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var prior in priorUsable)
            {
                prior.InvalidatedAt = now;
            }

            var rawToken = InvitationTokenGenerator.GenerateToken();

            var invitation = new UserInvitation
            {
                UserId = user.Id,
                TokenHash = InvitationTokenGenerator.Hash(rawToken),
                CreatedAt = now,
                ExpiresAt = now.Add(InvitationLifetime),
                DeliveryStatus = InvitationDeliveryStatus.Pending,
            };

            _context.UserInvitations.Add(invitation);

            // Persisted before the webhook attempt, which makes this row the outbox record
            // for the delivery: if n8n is unreachable below, only DeliveryStatus changes and
            // the user still has a valid, retryable invitation rather than no way in.
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Dispatching invitation webhook for user {UserId} (invitation {InvitationId}).",
                user.Id, invitation.Id);

            var delivered = await _invitationWebhook.PublishInvitationCreatedAsync(
                user, invitation.Id, rawToken, invitation.ExpiresAt, cancellationToken);

            invitation.DeliveryStatus = delivered ? InvitationDeliveryStatus.Sent : InvitationDeliveryStatus.Failed;
            invitation.DeliveryAttemptedAt = DateTime.UtcNow;
            invitation.DeliveryError = delivered
                ? null
                : "The n8n invitation webhook did not accept the event. Use 'resend invitation' to try again.";

            await _context.SaveChangesAsync(cancellationToken);

            if (delivered)
            {
                _logger.LogInformation(
                    "Invitation webhook delivered for user {UserId} (invitation {InvitationId}).",
                    user.Id, invitation.Id);
            }
            else
            {
                _logger.LogWarning(
                    "Invitation webhook was not delivered for user {UserId} (invitation {InvitationId}). The invitation row remains valid and retryable via resend.",
                    user.Id, invitation.Id);
            }

            return delivered;
        }

        public async Task<InvitationValidationResultDto> ValidateInvitationAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return InvalidInvitationResult();
            }

            var tokenHash = InvitationTokenGenerator.Hash(token);
            var now = DateTime.UtcNow;

            var invitation = await _context.UserInvitations
                .AsNoTracking()
                .Include(i => i.User)
                .FirstOrDefaultAsync(i => i.TokenHash == tokenHash);

            // Every rejection below - unknown token, expired, consumed, revoked, missing
            // user, already-activated user - returns the same generic result, so the
            // response can't be used to probe which accounts exist or what state they're in.
            if (invitation == null || !invitation.IsUsable(now))
            {
                return InvalidInvitationResult();
            }

            if (invitation.User == null || invitation.User.PasswordSetupCompletedAt != null)
            {
                return InvalidInvitationResult();
            }

            return new InvitationValidationResultDto
            {
                IsValid = true,
                Message = "Invitation is valid.",
                Email = invitation.User.Email,
                ExpiresAt = invitation.ExpiresAt,
            };
        }

        public async Task<SetInitialPasswordResult> SetInitialPasswordAsync(SetInitialPasswordDto dto)
        {
            // ConfirmPassword is optional: the documented API contract is { token,
            // newPassword }, but when a client does send a confirmation it must match.
            if (!string.IsNullOrEmpty(dto.ConfirmPassword) && dto.NewPassword != dto.ConfirmPassword)
            {
                return new SetInitialPasswordResult
                {
                    Outcome = SetInitialPasswordOutcome.PasswordMismatch,
                    Message = "Password and confirmation do not match.",
                };
            }

            var policyViolation = PasswordPolicy.Validate(dto.NewPassword);
            if (policyViolation != null)
            {
                return new SetInitialPasswordResult
                {
                    Outcome = SetInitialPasswordOutcome.PasswordRequirementsNotMet,
                    Message = policyViolation,
                };
            }

            if (_weakPasswordChecker.IsTooCommon(dto.NewPassword))
            {
                return new SetInitialPasswordResult
                {
                    Outcome = SetInitialPasswordOutcome.WeakPassword,
                    Message = "This password is too common. Please choose a different one.",
                };
            }

            var tokenHash = InvitationTokenGenerator.Hash(dto.Token);
            var now = DateTime.UtcNow;

            var invitation = await _context.UserInvitations.FirstOrDefaultAsync(i => i.TokenHash == tokenHash);
            if (invitation == null || !invitation.IsUsable(now))
            {
                return InvalidTokenResult();
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == invitation.UserId);
            if (user == null || user.PasswordSetupCompletedAt != null)
            {
                return InvalidTokenResult();
            }

            // The in-memory provider (used by tests) doesn't support real transactions;
            // IsRelational() is false there, so this degrades to a plain SaveChangesAsync.
            IDbContextTransaction? transaction = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync()
                : null;

            try
            {
                // ConsumedAt is a concurrency token (see UserInvitation): if another request
                // already consumed this same invitation between our read and this write,
                // SaveChangesAsync throws DbUpdateConcurrencyException below instead of both
                // requests succeeding.
                invitation.ConsumedAt = DateTime.UtcNow;
                user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
                user.PasswordSetupCompletedAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                if (transaction != null)
                {
                    await transaction.CommitAsync();
                }
            }
            catch (DbUpdateConcurrencyException)
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync();
                }

                return InvalidTokenResult();
            }
            catch
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync();
                }

                throw;
            }
            finally
            {
                if (transaction != null)
                {
                    await transaction.DisposeAsync();
                }
            }

            return new SetInitialPasswordResult
            {
                Outcome = SetInitialPasswordOutcome.Success,
                Message = "Password created successfully. You can now log in.",
            };
        }

        public async Task<ResendInvitationResult> ResendInvitationAsync(Guid userId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return new ResendInvitationResult
                {
                    Outcome = ResendInvitationOutcome.UserNotFound,
                    Message = "User not found.",
                };
            }

            if (user.PasswordSetupCompletedAt != null)
            {
                return new ResendInvitationResult
                {
                    Outcome = ResendInvitationOutcome.UserNotPendingActivation,
                    Message = "This account has already completed its initial password setup.",
                };
            }

            var delivered = await IssueInvitationAsync(user);

            return new ResendInvitationResult
            {
                Outcome = ResendInvitationOutcome.Success,
                Message = delivered
                    ? "A new invitation has been sent."
                    : "A new invitation was created, but it could not be handed off for delivery. Try resending again shortly.",
                InvitationEmailSent = delivered,
            };
        }

        private static SetInitialPasswordResult InvalidTokenResult() => new()
        {
            Outcome = SetInitialPasswordOutcome.InvalidOrExpiredToken,
            Message = "This invitation link is invalid, expired, or has already been used.",
        };

        private static InvitationValidationResultDto InvalidInvitationResult() => new()
        {
            IsValid = false,
            Message = "This invitation link is invalid, expired, or has already been used.",
        };
    }
}
