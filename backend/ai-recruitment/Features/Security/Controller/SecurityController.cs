using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ai_recruitment.Features.Security.Dto;
using ai_recruitment.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ai_recruitment.Features.Security.Controller
{
    // Settings > Security. Every action acts on the CURRENT user only (taken from the "sub"
    // claim via GetUserId() below) - none of these ever accept a userId from the client, and
    // none require a module permission, so a valid, non-revoked token is always enough.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SecurityController : ControllerBase
    {
        private readonly ISecurityService _securityService;

        public SecurityController(ISecurityService securityService)
        {
            _securityService = securityService;
        }

        [HttpGet("getSecuritySummary")]
        public async Task<IActionResult> GetSecuritySummary(CancellationToken cancellationToken)
        {
            var summary = await _securityService.GetSecuritySummaryAsync(GetUserId(), cancellationToken);
            return Ok(summary);
        }

        /// <summary>Changes the current user's password and signs out every other session.</summary>
        /// <remarks>
        /// On success, every OTHER active session for this user is revoked (the session making
        /// this request is kept) - the frontend should tell the user that other devices were
        /// signed out. Rate limited to 5 attempts per 15 minutes per user.
        /// </remarks>
        [HttpPost("changePassword")]
        [EnableRateLimiting(RateLimiterPolicies.ChangePassword)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken cancellationToken)
        {
            var result = await _securityService.ChangePasswordAsync(GetUserId(), GetTokenId(), dto, cancellationToken);

            if (!result.Succeeded)
            {
                return BadRequest(new { field = result.Field, message = result.Message });
            }

            return Ok(new { message = result.Message, otherSessionsSignedOut = result.OtherSessionsSignedOut });
        }

        [HttpGet("getActiveSessions")]
        public async Task<IActionResult> GetActiveSessions(CancellationToken cancellationToken)
        {
            var sessions = await _securityService.GetActiveSessionsAsync(GetUserId(), GetTokenId(), cancellationToken);
            return Ok(sessions);
        }

        /// <summary>Revokes one of the current user's own sessions. Revoking the current session behaves like logout.</summary>
        [HttpDelete("revokeSession/{sessionId:guid}")]
        public async Task<IActionResult> RevokeSession(Guid sessionId, CancellationToken cancellationToken)
        {
            var revoked = await _securityService.RevokeSessionAsync(GetUserId(), sessionId, cancellationToken);

            // 404 whether the session doesn't exist or belongs to someone else, so ids can't
            // be probed to find out which is true.
            if (!revoked)
            {
                return NotFound(new { message = "Session not found." });
            }

            return NoContent();
        }

        /// <summary>Revokes every active session for the current user, including this one by default.</summary>
        [HttpPost("logoutAllSessions")]
        public async Task<IActionResult> LogoutAllSessions([FromBody] LogoutAllSessionsDto? dto, CancellationToken cancellationToken)
        {
            var revokedCount = await _securityService.LogoutAllSessionsAsync(
                GetUserId(), dto?.KeepCurrent ?? false, GetTokenId(), cancellationToken);

            return Ok(new { message = "Signed out of all sessions.", sessionsSignedOut = revokedCount });
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string GetTokenId() => User.FindFirstValue(JwtRegisteredClaimNames.Jti)!;
    }
}
