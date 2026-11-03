using System.Security.Claims;
using System.Text;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Services;
using ai_recruitment.Features.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ai_recruitment.Features.Inbox.Controller
{
    [ApiController]
    [Route("api/inbox")]
    [Authorize]
    public class InboxController : ControllerBase
    {
        private readonly IInboxQueryService _query;
        private readonly IInboxMutationService _mutation;
        private readonly IInboxSendService _send;
        private readonly IInboxEventBroadcaster _broadcaster;
        private readonly IEmailAiService _ai;
        private readonly ILogger<InboxController> _logger;

        public InboxController(
            IInboxQueryService query,
            IInboxMutationService mutation,
            IInboxSendService send,
            IInboxEventBroadcaster broadcaster,
            IEmailAiService ai,
            ILogger<InboxController> logger)
        {
            _query = query;
            _mutation = mutation;
            _send = send;
            _broadcaster = broadcaster;
            _ai = ai;
            _logger = logger;
        }

        [HttpGet("messages")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task<IActionResult> GetMessages(
            [FromQuery] string folder = "inbox",
            [FromQuery] string? search = null,
            [FromQuery] string filter = "all",
            [FromQuery] string? label = null,
            [FromQuery] string sort = "newest",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var result = await _query.GetThreadsAsync(folder, search, filter, label, sort, page, pageSize, cancellationToken);
            return Ok(result);
        }

        [HttpGet("counts")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task<IActionResult> GetCounts(CancellationToken cancellationToken)
        {
            return Ok(await _query.GetCountsAsync(cancellationToken));
        }

        [HttpGet("threads/{threadId}")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task<IActionResult> GetThread(string threadId, CancellationToken cancellationToken)
        {
            var thread = await _query.GetThreadAsync(threadId, cancellationToken);
            return thread == null ? NotFound(Error("THREAD_NOT_FOUND", "Thread not found.")) : Ok(thread);
        }

        [HttpPatch("messages/{id:guid}")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task<IActionResult> PatchMessage(Guid id, [FromBody] PatchMessageDto dto, CancellationToken cancellationToken)
        {
            var updated = await _mutation.PatchMessageAsync(id, dto, cancellationToken);
            return updated ? Ok(new { message = "Message updated." }) : NotFound(Error("MESSAGE_NOT_FOUND", "Message not found."));
        }

        [HttpPatch("messages/bulk")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task<IActionResult> BulkPatch([FromBody] BulkMessageActionDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var updated = await _mutation.BulkActionAsync(dto, cancellationToken);
                return Ok(new { updatedCount = updated });
            }
            catch (InboxOperationException ex)
            {
                return BadRequest(Error("INVALID_BULK_ACTION", ex.Message));
            }
        }

        [HttpDelete("messages/{id:guid}/permanent")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task<IActionResult> PermanentDelete(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var deleted = await _mutation.PermanentDeleteAsync(id, cancellationToken);
                return deleted ? NoContent() : NotFound(Error("MESSAGE_NOT_FOUND", "Message not found."));
            }
            catch (InboxOperationException ex)
            {
                return BadRequest(Error("NOT_IN_TRASH", ex.Message));
            }
        }

        [HttpPost("drafts")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> CreateDraft([FromBody] SaveDraftDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var draft = await _mutation.SaveDraftAsync(null, dto, GetUserId(), cancellationToken);
                return StatusCode(StatusCodes.Status201Created, draft);
            }
            catch (InboxOperationException ex)
            {
                return BadRequest(Error("DRAFT_SAVE_FAILED", ex.Message));
            }
        }

        [HttpPut("drafts/{id:guid}")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] SaveDraftDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var draft = await _mutation.SaveDraftAsync(id, dto, GetUserId(), cancellationToken);
                return Ok(draft);
            }
            catch (InboxOperationException ex)
            {
                return BadRequest(Error("DRAFT_SAVE_FAILED", ex.Message));
            }
        }

        [HttpDelete("drafts/{id:guid}")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> DiscardDraft(Guid id, CancellationToken cancellationToken)
        {
            var discarded = await _mutation.DiscardDraftAsync(id, cancellationToken);
            return discarded ? NoContent() : NotFound(Error("DRAFT_NOT_FOUND", "Draft not found."));
        }

        [HttpPost("attachments")]
        [HasPermission(PermissionNames.Inbox.Send)]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(InboxAttachmentPolicy.MaxTotalBytesPerEmail)]
        public async Task<IActionResult> UploadAttachment(IFormFile file, CancellationToken cancellationToken)
        {
            try
            {
                var attachment = await _mutation.UploadAttachmentAsync(file, cancellationToken);
                return Ok(attachment);
            }
            catch (InboxOperationException ex)
            {
                return BadRequest(Error("ATTACHMENT_REJECTED", ex.Message));
            }
        }

        [HttpPost("send")]
        [HasPermission(PermissionNames.Inbox.Send)]
        [EnableRateLimiting(RateLimiterPolicies.InboxSend)]
        public async Task<IActionResult> Send(
            [FromBody] SendEmailDto dto,
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _send.SendAsync(dto, GetUserId(), idempotencyKey, cancellationToken);
                return Accepted(result);
            }
            catch (InboxOperationException ex)
            {
                return BadRequest(Error("SEND_VALIDATION_FAILED", ex.Message));
            }
        }

        [HttpPost("messages/{id:guid}/retry")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> Retry(Guid id, CancellationToken cancellationToken)
        {
            var retried = await _send.RetryAsync(id, cancellationToken);
            return retried
                ? Accepted(new { messageId = id, status = "sending" })
                : NotFound(Error("MESSAGE_NOT_RETRYABLE", "Message not found or not in a Failed state."));
        }

        [HttpPost("ai/write")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> AiWrite([FromBody] AiWriteRequestDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(dto.Prompt))
            {
                return BadRequest(Error("PROMPT_REQUIRED", "Prompt is required."));
            }

            var result = await _ai.WriteAsync(dto.Prompt, dto.Tone, dto.RecipientName, cancellationToken);
            return Ok(result);
        }

        [HttpPost("ai/suggest-reply")]
        [HasPermission(PermissionNames.Inbox.Send)]
        public async Task<IActionResult> AiSuggestReply([FromBody] AiSuggestReplyRequestDto dto, CancellationToken cancellationToken)
        {
            var thread = await _query.GetThreadAsync(dto.ThreadId.ToString(), cancellationToken);
            if (thread == null)
            {
                return NotFound(Error("THREAD_NOT_FOUND", "Thread not found."));
            }

            var recent = thread.Messages
                .TakeLast(5)
                .Select(m => (m.FromName, m.BodyText))
                .ToList();

            var suggestions = await _ai.SuggestReplyAsync(recent, cancellationToken);
            return Ok(new AiSuggestReplyResponseDto { Suggestions = suggestions });
        }

        [HttpGet("events")]
        [HasPermission(PermissionNames.Inbox.View)]
        public async Task Events(CancellationToken cancellationToken)
        {
            Response.Headers.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            var (reader, subscription) = _broadcaster.Subscribe();
            using var _ = subscription;

            try
            {
                await Response.WriteAsync(": connected\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);

                await foreach (var message in reader.ReadAllAsync(cancellationToken))
                {
                    await Response.WriteAsync(message, Encoding.UTF8, cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }
            }
            catch (OperationCanceledException)
            {
                // Client disconnected - normal.
            }
        }

        private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private static object Error(string code, string message) => new { error = new { code, message } };
    }
}
