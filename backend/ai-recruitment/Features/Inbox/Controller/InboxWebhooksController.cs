using System.Security.Cryptography;
using System.Text;
using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using ai_recruitment.Features.Inbox.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Inbox.Controller
{
    // Called by n8n, not a logged-in user - authenticated with the shared secret header
    // instead of a JWT, exactly like ApplicantScreeningController's callback endpoint.
    [ApiController]
    [Route("api/webhooks/n8n")]
    [AllowAnonymous]
    public class InboxWebhooksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly N8nEmailOptions _options;
        private readonly IInboxCandidateLinkService _candidateLink;
        private readonly IHtmlSanitizerService _sanitizer;
        private readonly IEmailAttachmentStorage _attachmentStorage;
        private readonly IInboxEventBroadcaster _broadcaster;
        private readonly InboxReceiveNotifyChannel _receiveNotifyChannel;
        private readonly ILogger<InboxWebhooksController> _logger;

        public InboxWebhooksController(
            AppDbContext context,
            IOptions<N8nEmailOptions> options,
            IInboxCandidateLinkService candidateLink,
            IHtmlSanitizerService sanitizer,
            IEmailAttachmentStorage attachmentStorage,
            IInboxEventBroadcaster broadcaster,
            InboxReceiveNotifyChannel receiveNotifyChannel,
            ILogger<InboxWebhooksController> logger)
        {
            _context = context;
            _options = options.Value;
            _candidateLink = candidateLink;
            _sanitizer = sanitizer;
            _attachmentStorage = attachmentStorage;
            _broadcaster = broadcaster;
            _receiveNotifyChannel = receiveNotifyChannel;
            _logger = logger;
        }

        [HttpPost("send-result")]
        public async Task<IActionResult> SendResult([FromBody] N8nSendResultDto dto, CancellationToken cancellationToken)
        {
            if (!IsAuthenticated(Request))
            {
                return Unauthorized(Error("INVALID_SECRET", "Invalid or missing webhook secret."));
            }

            var message = await _context.EmailMessages.FirstOrDefaultAsync(m => m.Id == dto.MessageId, cancellationToken);
            if (message == null)
            {
                return NotFound(Error("MESSAGE_NOT_FOUND", "Message not found."));
            }

            if (dto.Success)
            {
                message.Status = EmailStatus.Sent;
                message.GmailMessageId = dto.GmailMessageId;
                message.GmailThreadId = dto.GmailThreadId ?? message.GmailThreadId;
                message.SentAt = dto.SentAt ?? DateTime.UtcNow;
                message.ErrorMessage = null;
                _context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = message.Id, Event = "sent" });
            }
            else
            {
                message.Status = EmailStatus.Failed;
                message.ErrorMessage = dto.Error ?? "n8n reported a send failure.";
                _context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = message.Id, Event = "send_failed" });
            }

            message.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            _broadcaster.Publish(dto.Success ? "message.sent" : "message.failed", new { messageId = message.Id, error = message.ErrorMessage });
            _broadcaster.Publish("counts.updated", new { });

            return Ok(new { message = "Recorded." });
        }

        [HttpPost("inbound-email")]
        public async Task<IActionResult> InboundEmail([FromBody] N8nInboundEmailDto dto, CancellationToken cancellationToken)
        {
            if (!IsAuthenticated(Request))
            {
                return Unauthorized(Error("INVALID_SECRET", "Invalid or missing webhook secret."));
            }

            var existing = await _context.EmailMessages
                .FirstOrDefaultAsync(m => m.GmailMessageId == dto.GmailMessageId, cancellationToken);
            if (existing != null)
            {
                return Ok(new { message = "Already recorded.", duplicate = true });
            }

            var bodyHtml = _sanitizer.Sanitize(string.IsNullOrWhiteSpace(dto.BodyHtml) ? dto.BodyText : dto.BodyHtml);
            var bodyText = string.IsNullOrWhiteSpace(dto.BodyText) ? _sanitizer.ToPlainText(bodyHtml) : dto.BodyText;

            // Groups into any existing thread sharing this Gmail thread id, or starts a new one.
            var existingThread = await _context.EmailMessages
                .Where(m => m.GmailThreadId == dto.GmailThreadId)
                .OrderBy(m => m.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            var message = new EmailMessage
            {
                Id = Guid.NewGuid(),
                ThreadId = existingThread?.ThreadId ?? Guid.NewGuid(),
                GmailMessageId = dto.GmailMessageId,
                GmailThreadId = dto.GmailThreadId,
                Direction = EmailDirection.Inbound,
                Status = EmailStatus.Received,
                FromName = string.IsNullOrWhiteSpace(dto.FromName) ? dto.FromEmail : dto.FromName,
                FromEmail = dto.FromEmail,
                ToEmails = dto.To,
                CcEmails = dto.Cc,
                Subject = dto.Subject,
                BodyHtml = bodyHtml,
                BodyText = bodyText,
                IsRead = false,
                ReceivedAt = dto.ReceivedAt ?? DateTime.UtcNow,
            };

            var candidate = await _candidateLink.FindCandidateAsync([dto.FromEmail], cancellationToken);
            if (candidate != null)
            {
                var card = await _candidateLink.BuildCardAsync(candidate, cancellationToken);
                message.Labels = [_candidateLink.ResolveLabelForStatus(card!.Status)];
            }

            _context.EmailMessages.Add(message);

            if (dto.Attachments is { Count: > 0 })
            {
                foreach (var inbound in dto.Attachments)
                {
                    try
                    {
                        var bytes = Convert.FromBase64String(inbound.ContentBase64);
                        using var stream = new MemoryStream(bytes);
                        var attachmentId = Guid.NewGuid();
                        var uploaded = await _attachmentStorage.UploadAsync(attachmentId, inbound.Filename, inbound.MimeType, stream, cancellationToken);

                        _context.EmailAttachments.Add(new EmailAttachment
                        {
                            Id = attachmentId,
                            MessageId = message.Id,
                            Filename = inbound.Filename,
                            MimeType = inbound.MimeType,
                            Size = bytes.LongLength,
                            StorageUrl = uploaded.StoragePath,
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to store an inbound attachment for Gmail message {GmailMessageId}; skipping it.", dto.GmailMessageId);
                    }
                }
            }

            _context.EmailAuditLogs.Add(new EmailAuditLog { Id = Guid.NewGuid(), MessageId = message.Id, Event = "received" });
            await _context.SaveChangesAsync(cancellationToken);

            // Non-blocking nudge to InboxReceiveNotifyDispatcher - never delays or fails this
            // request. The dispatcher's periodic sweep is the durability net if this signal is
            // ever missed (e.g. an app restart right after SaveChangesAsync).
            _receiveNotifyChannel.SignalPending(message.Id);

            _broadcaster.Publish("message.received", new { messageId = message.Id, threadId = message.GmailThreadId ?? message.ThreadId.ToString() });
            _broadcaster.Publish("counts.updated", new { });

            return Ok(new { message = "Recorded.", messageId = message.Id });
        }

        private bool IsAuthenticated(HttpRequest request)
        {
            if (string.IsNullOrWhiteSpace(_options.SharedSecret))
            {
                _logger.LogError("{Key} is not configured; rejecting all Inbox webhook callbacks.", N8nEmailOptions.EnvSharedSecret);
                return false;
            }

            if (!request.Headers.TryGetValue(_options.SecretHeaderName, out var provided))
            {
                return false;
            }

            var expectedBytes = Encoding.UTF8.GetBytes(_options.SharedSecret);
            var providedBytes = Encoding.UTF8.GetBytes(provided.ToString());

            return expectedBytes.Length == providedBytes.Length
                && CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
        }

        private static object Error(string code, string message) => new { error = new { code, message } };
    }
}
