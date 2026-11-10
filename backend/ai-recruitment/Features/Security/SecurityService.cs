using ai_recruitment.Data;
using ai_recruitment.Features.Security.Dto;
using ai_recruitment.Features.Security.Model;
using ai_recruitment.Features.Users;
using ai_recruitment.Features.Users.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Caching.Memory;

namespace ai_recruitment.Features.Security
{
    public class SecurityService : ISecurityService
    {
        // Brief cache for the per-request "is this jti still active" check so a revoked
        // session doesn't cost a DB round trip on every single authenticated request.
        private static readonly TimeSpan ActiveSessionCacheDuration = TimeSpan.FromSeconds(45);

        // LastActiveAt only needs to be roughly fresh for the Active Sessions list, so writes
        // are throttled to at most once per window per token instead of once per request.
        private static readonly TimeSpan LastActiveTouchWindow = TimeSpan.FromMinutes(3);

        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly IWeakPasswordChecker _weakPasswordChecker;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public SecurityService(AppDbContext context, IMemoryCache cache, IWeakPasswordChecker weakPasswordChecker)
        {
            _context = context;
            _cache = cache;
            _weakPasswordChecker = weakPasswordChecker;
        }

        public UserSession TrackNewSession(Guid userId, string tokenId, DateTime expiresAt, HttpContext httpContext)
        {
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();
            var (browser, operatingSystem) = UserAgentParser.Parse(userAgent);

            var session = new UserSession
            {
                UserId = userId,
                TokenId = tokenId,
                UserAgent = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent,
                Browser = browser,
                OperatingSystem = operatingSystem,
                DeviceLabel = UserAgentParser.BuildDeviceLabel(browser, operatingSystem),
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
            };

            _context.UserSessions.Add(session);
            return session;
        }

        public async Task<SecuritySummaryDto> GetSecuritySummaryAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var user = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new { u.PasswordChangedAt })
                .FirstOrDefaultAsync(cancellationToken);

            // The PREVIOUS login, not the one whose token is making this request - that one's
            // own UserSessions row is the most recent, so it's skipped here.
            var previousLoginAt = await _context.UserSessions
                .AsNoTracking()
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .Skip(1)
                .Select(s => (DateTime?)s.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            return new SecuritySummaryDto
            {
                LastLoginAt = previousLoginAt,
                PasswordChangedAt = user?.PasswordChangedAt,
            };
        }

        public async Task<ChangePasswordResult> ChangePasswordAsync(
            Guid userId,
            string currentTokenId,
            ChangePasswordDto dto,
            CancellationToken cancellationToken = default)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (user == null)
            {
                return ChangePasswordResult.Fail(
                    ChangePasswordOutcome.WrongCurrentPassword, "currentPassword", "Current password is incorrect.");
            }

            if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword) == PasswordVerificationResult.Failed)
            {
                return ChangePasswordResult.Fail(
                    ChangePasswordOutcome.WrongCurrentPassword, "currentPassword", "Current password is incorrect.");
            }

            if (dto.NewPassword != dto.ConfirmNewPassword)
            {
                return ChangePasswordResult.Fail(
                    ChangePasswordOutcome.Mismatch, "confirmNewPassword", "New password and confirmation do not match.");
            }

            var policyViolation = PasswordPolicy.Validate(dto.NewPassword);
            if (policyViolation != null)
            {
                return ChangePasswordResult.Fail(ChangePasswordOutcome.WeakPassword, "newPassword", policyViolation);
            }

            if (_weakPasswordChecker.IsTooCommon(dto.NewPassword))
            {
                return ChangePasswordResult.Fail(
                    ChangePasswordOutcome.WeakPassword, "newPassword", "This password is too common. Please choose a different one.");
            }

            if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.NewPassword) != PasswordVerificationResult.Failed)
            {
                return ChangePasswordResult.Fail(
                    ChangePasswordOutcome.SameAsCurrent, "newPassword", "New password must be different from your current password.");
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
            user.PasswordChangedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            var revokedTokenIds = await GetOtherActiveTokenIdsAsync(userId, currentTokenId, cancellationToken);

            // The in-memory provider (used by tests) doesn't support real transactions;
            // IsRelational() is false there, so this degrades to plain sequential writes.
            IDbContextTransaction? transaction = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync(cancellationToken)
                : null;

            try
            {
                await RevokeTokensAsync(revokedTokenIds, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);

                if (transaction != null)
                {
                    await transaction.CommitAsync(cancellationToken);
                }
            }
            catch
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync(cancellationToken);
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

            foreach (var tokenId in revokedTokenIds)
            {
                _cache.Remove(ActiveSessionCacheKey(tokenId));
            }

            return ChangePasswordResult.Success(revokedTokenIds.Count);
        }

        public async Task<IReadOnlyList<ActiveSessionDto>> GetActiveSessionsAsync(
            Guid userId,
            string? currentTokenId,
            CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;

            return await _context.UserSessions
                .AsNoTracking()
                .Where(s => s.UserId == userId && s.RevokedAt == null && s.ExpiresAt > now)
                .OrderByDescending(s => s.LastActiveAt)
                .Select(s => new ActiveSessionDto
                {
                    SessionId = s.SessionId,
                    DeviceLabel = s.DeviceLabel,
                    Browser = s.Browser,
                    OperatingSystem = s.OperatingSystem,
                    IpAddress = s.IpAddress,
                    CreatedAt = s.CreatedAt,
                    LastActiveAt = s.LastActiveAt,
                    IsCurrent = s.TokenId == currentTokenId,
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
        {
            var session = await _context.UserSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.UserId == userId, cancellationToken);

            if (session == null)
            {
                return false;
            }

            session.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            _cache.Remove(ActiveSessionCacheKey(session.TokenId));

            return true;
        }

        public async Task<int> LogoutAllSessionsAsync(
            Guid userId,
            bool keepCurrent,
            string? currentTokenId,
            CancellationToken cancellationToken = default)
        {
            var tokenIds = keepCurrent
                ? await GetOtherActiveTokenIdsAsync(userId, currentTokenId, cancellationToken)
                : await GetActiveTokenIdsAsync(userId, cancellationToken);

            await RevokeTokensAsync(tokenIds, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            foreach (var tokenId in tokenIds)
            {
                _cache.Remove(ActiveSessionCacheKey(tokenId));
            }

            return tokenIds.Count;
        }

        public async Task<bool> IsSessionActiveAsync(string tokenId, CancellationToken cancellationToken = default)
        {
            var cacheKey = ActiveSessionCacheKey(tokenId);
            if (_cache.TryGetValue(cacheKey, out bool cachedIsActive))
            {
                return cachedIsActive;
            }

            var session = await _context.UserSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.TokenId == tokenId, cancellationToken);

            // No row at all means this token was issued before session tracking shipped -
            // allow it until its own "exp" claim naturally expires (already enforced
            // elsewhere) instead of silently logging out everyone currently signed in.
            var isActive = session == null || (session.RevokedAt == null && session.ExpiresAt > DateTime.UtcNow);

            _cache.Set(cacheKey, isActive, ActiveSessionCacheDuration);
            return isActive;
        }

        public async Task TouchLastActiveAsync(string tokenId, CancellationToken cancellationToken = default)
        {
            var throttleKey = TouchThrottleCacheKey(tokenId);
            if (_cache.TryGetValue(throttleKey, out _))
            {
                return;
            }

            _cache.Set(throttleKey, true, LastActiveTouchWindow);

            await _context.UserSessions
                .Where(s => s.TokenId == tokenId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.LastActiveAt, DateTime.UtcNow), cancellationToken);
        }

        private async Task<List<string>> GetActiveTokenIdsAsync(Guid userId, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            return await _context.UserSessions
                .Where(s => s.UserId == userId && s.RevokedAt == null && s.ExpiresAt > now)
                .Select(s => s.TokenId)
                .ToListAsync(cancellationToken);
        }

        private async Task<List<string>> GetOtherActiveTokenIdsAsync(Guid userId, string? currentTokenId, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            return await _context.UserSessions
                .Where(s => s.UserId == userId && s.RevokedAt == null && s.ExpiresAt > now && s.TokenId != currentTokenId)
                .Select(s => s.TokenId)
                .ToListAsync(cancellationToken);
        }

        private Task RevokeTokensAsync(IReadOnlyCollection<string> tokenIds, CancellationToken cancellationToken)
        {
            if (tokenIds.Count == 0)
            {
                return Task.CompletedTask;
            }

            return _context.UserSessions
                .Where(s => tokenIds.Contains(s.TokenId) && s.RevokedAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, DateTime.UtcNow), cancellationToken);
        }

        private static string ActiveSessionCacheKey(string tokenId) => $"session-active:{tokenId}";
        private static string TouchThrottleCacheKey(string tokenId) => $"session-touch:{tokenId}";
    }
}
