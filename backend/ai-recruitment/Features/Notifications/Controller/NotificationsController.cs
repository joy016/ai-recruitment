using System.Security.Claims;
using ai_recruitment.Features.Notifications.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ai_recruitment.Features.Notifications.Controller
{
    // Every endpoint here operates only on the calling user's own notifications/preferences -
    // the recipient/user id always comes from the JWT, never from the request - so a plain
    // [Authorize] is enough; there is no notion of one HR user managing another's notifications.
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IPreferenceService _preferenceService;

        public NotificationsController(INotificationService notificationService, IPreferenceService preferenceService)
        {
            _notificationService = notificationService;
            _preferenceService = preferenceService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool unreadOnly = false,
            CancellationToken cancellationToken = default)
        {
            var (items, totalCount) = await _notificationService.GetNotificationsAsync(
                GetUserId(), page, pageSize, unreadOnly, cancellationToken);

            return Ok(new
            {
                data = items,
                totalCount,
                page,
                pageSize,
            });
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
        {
            var count = await _notificationService.GetUnreadCountAsync(GetUserId(), cancellationToken);
            return Ok(new { unreadCount = count });
        }

        [HttpPatch("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
        {
            var success = await _notificationService.MarkAsReadAsync(GetUserId(), id, cancellationToken);
            if (!success)
            {
                return NotFound(new { message = "Notification not found." });
            }

            return Ok(new { statusCode = 200, statusMessage = "Notification marked as read." });
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
        {
            var updatedCount = await _notificationService.MarkAllAsReadAsync(GetUserId(), cancellationToken);
            return Ok(new { statusCode = 200, updatedCount });
        }

        [HttpGet("preferences")]
        public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
        {
            var preferences = await _preferenceService.GetPreferencesAsync(GetUserId(), cancellationToken);
            return Ok(preferences);
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences(
            [FromBody] List<UpdateNotificationPreferenceDto> updates,
            CancellationToken cancellationToken)
        {
            if (updates == null || updates.Count == 0)
            {
                return BadRequest(new { message = "At least one preference update is required." });
            }

            try
            {
                var result = await _preferenceService.UpdatePreferencesAsync(GetUserId(), updates, cancellationToken);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}
