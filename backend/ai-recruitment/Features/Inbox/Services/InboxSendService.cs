using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Inbox.Services
{
    public class InboxSendService : IInboxSendService
    {
        private readonly AppDbContext _context;
        private readonly IHtmlSanitizerService _sanitizer;
        private readonly InboxSendChannel _channel;

        public InboxSendService(AppDbContext context, IHtmlSanitizerService sanitizer, InboxSendChannel channel)
        {
            _context = context;
            _sanitizer = sanitizer;
            _channel = channel;
        }

        public async Task<SendEmailResponseDto> SendAsync(SendEmailDto dto, Guid userId, string? idempotencyKey, CancellationToken cancellationToken)
        {
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                var existing = await _context.EmailMessages.AsNoTracking()
                    .FirstOrDefaultAsync(m => m.SentByUserId == userId && m.IdempotencyKey == idempotencyKey, cancellationToken);
                if (existing != null)
                {
                    return new SendEmailResponseDto { MessageId = existing.Id, Status = existing.Status.ToString().ToLowerInvariant() };
                }
            }

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                ?? throw new InboxOperationException("Sending user not found.");

            EmailMessage? original = null;
            if (dto.ReplyToMessageId.HasValue)
            {
                original = await _context.EmailMessages.AsNoTracking()
                    .FirstOrDefaultAsync(m => m.Id == dto.ReplyToMessageId.Value, cancellationToken)
                    ?? throw new InboxOperationException("The message being replied to was not found.");
            }

            var to = new List<string>(dto.To);
            var cc = new List<string>(dto.Cc);
            var subject = dto.Subject?.Trim() ?? string.Empty;
            var bodyHtml = dto.BodyHtml ?? string.Empty;

            if (original != null)
            {
                switch (dto.Mode)
                {
                    case "reply":
                        if (to.Count == 0) to.Add(original.FromEmail);
                        break;
                    case "reply_all":
                        if (to.Count == 0)
                        {
                            to.Add(original.FromEmail);
                            to.AddRange(original.ToEmails.Where(e => !string.Equals(e, user.Email, StringComparison.OrdinalIgnoreCase)));
                        }
                        if (cc.Count == 0) cc.AddRange(original.CcEmails);
                        break;
                    case "forward":
                        bodyHtml = $"{bodyHtml}{BuildForwardQuote(original)}";
                        break;
                }

                if (string.IsNullOrWhiteSpace(subject))
                {
                    subject = BuildSubject(dto.Mode, original.Subject);
                }
            }

            to = to.Where(e => !string.IsNullOrWhiteSpace(e)).Select(e => e.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            cc = cc.Where(e => !string.IsNullOrWhiteSpace(e)).Select(e => e.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var bcc = dto.Bcc.Where(e => !string.IsNullOrWhiteSpace(e)).Select(e => e.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            if (to.Count == 0)
            {
                throw new InboxOperationException("At least one valid recipient is required.");
            }

            if (string.IsNullOrWhiteSpace(subject))
            {
                throw new InboxOperationException("Subject is required.");
            }

            var sanitizedBody = _sanitizer.Sanitize(bodyHtml);
            var bodyText = _sanitizer.ToPlainText(sanitizedBody);
            if (string.IsNullOrWhiteSpace(bodyText))
            {
                throw new InboxOperationException("Email body cannot be empty.");
            }

            var attachmentIds = new List<Guid>(dto.AttachmentIds);
            if (dto.Mode == "forward" && original != null)
            {
                var originalAttachmentIds = await _context.EmailAttachments
                    .Where(a => a.MessageId == original.Id)
                    .Select(a => a.Id)
                    .ToListAsync(cancellationToken);
                attachmentIds.AddRange(originalAttachmentIds.Where(id => !attachmentIds.Contains(id)));
            }

            var attachments = attachmentIds.Count == 0
                ? []
                : await _context.EmailAttachments.Where(a => attachmentIds.Contains(a.Id)).ToListAsync(cancellationToken);

            if (attachments.Sum(a => a.Size) > InboxAttachmentPolicy.MaxTotalBytesPerEmail)
            {
                throw new InboxOperationException("Attachments exceed the 20 MB total limit for one email.");
            }

            EmailMessage message;
            if (dto.DraftId.HasValue)
            {
                message = await _context.EmailMessages
                    .FirstOrDefaultAsync(m => m.Id == dto.DraftId.Value && m.Status == EmailStatus.Draft, cancellationToken)
                    ?? throw new InboxOperationException("Draft not found.");
            }
            else
            {
                message = new EmailMessage
                {
                    Id = Guid.NewGuid(),
                    ThreadId = original?.ThreadId ?? Guid.NewGuid(),
                    GmailThreadId = original?.GmailThreadId,
                    Direction = EmailDirection.Outbound,
                    FromName = $"{user.FirstName} {user.LastName}".Trim(),
                    FromEmail = user.Email,
                    SentByUserId = user.Id,
                    Subject = subject,
                };
                _context.EmailMessages.Add(message);
            }

            if (original != null && dto.Mode is "reply" or "reply_all")
            {
                message.InReplyToGmailMessageId = original.GmailMessageId;
            }

            message.ToEmails = to;
            message.CcEmails = cc;
            message.BccEmails = bcc;
            message.Subject = subject;
            message.BodyHtml = sanitizedBody;
            message.BodyText = bodyText;
            message.Status = EmailStatus.Sending;
            message.ErrorMessage = null;
            message.TemplateId = dto.TemplateId;
            message.IdempotencyKey = idempotencyKey;
            message.AttemptCount = 0;
            message.NextAttemptAt = null;
            message.UpdatedAt = DateTime.UtcNow;

            foreach (var attachment in attachments)
            {
                attachment.MessageId = message.Id;
            }

            _context.EmailAuditLogs.Add(new EmailAuditLog
            {
                Id = Guid.NewGuid(),
                MessageId = message.Id,
                Event = "queued",
            });

            await _context.SaveChangesAsync(cancellationToken);

            _channel.SignalPending(message.Id);

            return new SendEmailResponseDto { MessageId = message.Id, Status = "sending" };
        }

        public async Task<bool> RetryAsync(Guid messageId, CancellationToken cancellationToken)
        {
            var updated = await _context.EmailMessages
                .Where(m => m.Id == messageId && m.Status == EmailStatus.Failed)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(m => m.Status, EmailStatus.Sending)
                    .SetProperty(m => m.AttemptCount, 0)
                    .SetProperty(m => m.NextAttemptAt, (DateTime?)null)
                    .SetProperty(m => m.ErrorMessage, (string?)null), cancellationToken);

            if (updated > 0)
            {
                _channel.SignalPending(messageId);
            }

            return updated > 0;
        }

        private static string BuildSubject(string mode, string originalSubject)
        {
            var prefix = mode == "forward" ? "Fwd:" : "Re:";
            var trimmed = originalSubject.Trim();
            return trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ? trimmed : $"{prefix} {trimmed}";
        }

        private static string BuildForwardQuote(EmailMessage original)
        {
            return "<p>---------- Forwarded message ----------</p>"
                + $"<p>From: {System.Net.WebUtility.HtmlEncode(original.FromName)} &lt;{System.Net.WebUtility.HtmlEncode(original.FromEmail)}&gt;<br>"
                + $"Date: {original.CreatedAt:R}<br>"
                + $"Subject: {System.Net.WebUtility.HtmlEncode(original.Subject)}<br>"
                + $"To: {System.Net.WebUtility.HtmlEncode(string.Join(", ", original.ToEmails))}</p>"
                + $"<blockquote>{original.BodyHtml}</blockquote>";
        }
    }
}
