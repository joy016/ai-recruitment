using ai_recruitment.Features.Security.Dto;
using ai_recruitment.Features.Security.Model;
using Microsoft.AspNetCore.Http;

namespace ai_recruitment.Features.Security
{
    public interface ISecurityService
    {
        // Called right after a successful login. Adds the new UserSession to the current
        // DbContext without saving - the caller (AuthController) persists it together with
        // its own User.LastLoginAt update in one SaveChangesAsync.
        UserSession TrackNewSession(Guid userId, string tokenId, DateTime expiresAt, HttpContext httpContext);

        Task<SecuritySummaryDto> GetSecuritySummaryAsync(Guid userId, CancellationToken cancellationToken = default);

        Task<ChangePasswordResult> ChangePasswordAsync(
            Guid userId,
            string currentTokenId,
            ChangePasswordDto dto,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<ActiveSessionDto>> GetActiveSessionsAsync(
            Guid userId,
            string? currentTokenId,
            CancellationToken cancellationToken = default);

        // False if the session doesn't exist or isn't owned by userId (so the controller can
        // return 404 either way, never revealing which).
        Task<bool> RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);

        // Returns how many sessions were revoked.
        Task<int> LogoutAllSessionsAsync(
            Guid userId,
            bool keepCurrent,
            string? currentTokenId,
            CancellationToken cancellationToken = default);

        // Used by the JwtBearer OnTokenValidated event on every authenticated request (result
        // is cached briefly - see SecurityService). True for a token with no session row at
        // all (issued before this feature shipped), so existing logins aren't locked out.
        Task<bool> IsSessionActiveAsync(string tokenId, CancellationToken cancellationToken = default);

        // Throttled - only actually writes at most once every few minutes per token.
        Task TouchLastActiveAsync(string tokenId, CancellationToken cancellationToken = default);
    }
}
