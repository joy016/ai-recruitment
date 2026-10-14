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
        private readonly IInvitationEmailService _emailService;
        private readonly IWeakPasswordChecker _weakPasswordChecker;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public UserInvitationService(
            AppDbContext context,
            IInvitationEmailService emailService,
            IWeakPasswordChecker weakPasswordChecker)
        {
            _context = context;
            _emailService = emailService;
            _weakPasswordChecker = weakPasswordChecker;
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

            // Persisted before the email attempt: a delivery failure below only affects
            // DeliveryStatus, never leaves the user without a (retryable) invitation record.
            await _context.SaveChangesAsync(cancellationToken);

            var delivered = await _emailService.SendInvitationEmailAsync(user, rawToken, cancellationToken);

            invitation.DeliveryStatus = delivered ? InvitationDeliveryStatus.Sent : InvitationDeliveryStatus.Failed;
            invitation.DeliveryAttemptedAt = DateTime.UtcNow;
            invitation.DeliveryError = delivered
                ? null
                : "Invitation email could not be delivered. Use 'resend invitation' to try again.";

            await _context.SaveChangesAsync(cancellationToken);

            return delivered;
        }

        public async Task<InvitationValidationResultDto> ValidateInvitationAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return new InvitationValidationResultDto { IsValid = false };
            }

            var tokenHash = InvitationTokenGenerator.Hash(token);
            var now = DateTime.UtcNow;

            var invitation = await _context.UserInvitations
                .AsNoTracking()
                .Include(i => i.User)
                .FirstOrDefaultAsync(i => i.TokenHash == tokenHash);

            if (invitation == null || !invitation.IsUsable(now))
            {
                return new InvitationValidationResultDto { IsValid = false };
            }

            return new InvitationValidationResultDto
            {
                IsValid = true,
                Email = invitation.User.Email,
                ExpiresAt = invitation.ExpiresAt,
            };
        }

        public async Task<SetInitialPasswordResult> SetInitialPasswordAsync(SetInitialPasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
            {
                return new SetInitialPasswordResult
                {
                    Outcome = SetInitialPasswordOutcome.PasswordMismatch,
                    Message = "Password and confirmation do not match.",
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
            if (user == null)
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
                    : "A new invitation was created, but the email could not be delivered. Try resending again shortly.",
                InvitationEmailSent = delivered,
            };
        }

        private static SetInitialPasswordResult InvalidTokenResult() => new()
        {
            Outcome = SetInitialPasswordOutcome.InvalidOrExpiredToken,
            Message = "This invitation link is invalid, expired, or has already been used.",
        };
    }
}
