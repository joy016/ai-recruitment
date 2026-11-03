using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Inbox.Services
{
    public class InboxMutationService : IInboxMutationService
    {
        private readonly AppDbContext _context;
        private readonly IHtmlSanitizerService _sanitizer;
        private readonly IEmailAttachmentStorage _attachmentStorage;
        private readonly IInboxEventBroadcaster _broadcaster;
        private readonly ILogger<InboxMutationService> _logger;

        public InboxMutationService(
            AppDbContext context,
            IHtmlSanitizerService sanitizer,
            IEmailAttachmentStorage attachmentStorage,
            IInboxEventBroadcaster broadcaster,
            ILogger<InboxMutationService> logger)
        {
            _context = context;
            _sanitizer = sanitizer;
            _attachmentStorage = attachmentStorage;
            _broadcaster = broadcaster;
            _logger = logger;
        }

        public async Task<bool> PatchMessageAsync(Guid id, PatchMessageDto dto, CancellationToken cancellationToken)
        {
            var message = await _context.EmailMessages.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
            if (message == null)
            {
                return false;
            }

            ApplyPatch(message, dto);
            await _context.SaveChangesAsync(cancellationToken);
            _broadcaster.Publish("counts.updated", new { });
            return true;
        }

        public async Task<int> BulkActionAsync(BulkMessageActionDto dto, CancellationToken cancellationToken)
        {
            if (dto.Ids.Count == 0)
            {
                return 0;
            }

            var messages = await _context.EmailMessages
                .Where(m => dto.Ids.Contains(m.Id))
                .ToListAsync(cancellationToken);

            foreach (var message in messages)
            {
                switch (dto.Action)
                {
                    case "archive":
                        message.IsArchived = true;
                        message.IsDeleted = false;
                        break;
                    case "trash":
                        message.IsDeleted = true;
                        break;
                    case "markRead":
                        message.IsRead = true;
                        break;
                    case "markUnread":
                        message.IsRead = false;
                        break;
                    case "restore":
                        message.IsDeleted = false;
                        message.IsArchived = false;
                        break;
                    default:
                        throw new InboxOperationException($"Unknown bulk action '{dto.Action}'.");
                }
                message.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);
            _broadcaster.Publish("counts.updated", new { });
            return messages.Count;
        }

        public async Task<bool> PermanentDeleteAsync(Guid id, CancellationToken cancellationToken)
        {
            var message = await _context.EmailMessages
                .Include(m => m.Attachments)
                .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

            if (message == null)
            {
                return false;
            }

            if (!message.IsDeleted)
            {
                throw new InboxOperationException("Only messages already in Trash can be permanently deleted.");
            }

            foreach (var attachment in message.Attachments)
            {
                await _attachmentStorage.DeleteAsync(attachment.StorageUrl, cancellationToken);
            }

            _context.EmailMessages.Remove(message);
            await _context.SaveChangesAsync(cancellationToken);
            _broadcaster.Publish("counts.updated", new { });
            return true;
        }

        public async Task<EmailMessageDto> SaveDraftAsync(Guid? draftId, SaveDraftDto dto, Guid userId, CancellationToken cancellationToken)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                ?? throw new InboxOperationException("Sending user not found.");

            EmailMessage draft;
            if (draftId.HasValue)
            {
                draft = await _context.EmailMessages.FirstOrDefaultAsync(m => m.Id == draftId.Value, cancellationToken)
                    ?? throw new InboxOperationException("Draft not found.");

                if (draft.Status != EmailStatus.Draft)
                {
                    throw new InboxOperationException("Only a message still in Draft status can be updated as a draft.");
                }
            }
            else
            {
                var threadId = Guid.NewGuid();
                string? gmailThreadId = null;

                if (dto.ReplyToMessageId.HasValue)
                {
                    var original = await _context.EmailMessages.AsNoTracking()
                        .FirstOrDefaultAsync(m => m.Id == dto.ReplyToMessageId.Value, cancellationToken);
                    if (original != null)
                    {
                        threadId = original.ThreadId;
                        gmailThreadId = original.GmailThreadId;
                    }
                }

                draft = new EmailMessage
                {
                    Id = Guid.NewGuid(),
                    ThreadId = threadId,
                    GmailThreadId = gmailThreadId,
                    Direction = EmailDirection.Outbound,
                    Status = EmailStatus.Draft,
                    FromName = $"{user.FirstName} {user.LastName}".Trim(),
                    FromEmail = user.Email,
                    SentByUserId = user.Id,
                    Subject = string.Empty,
                };
                _context.EmailMessages.Add(draft);
            }

            draft.ToEmails = dto.To;
            draft.CcEmails = dto.Cc;
            draft.BccEmails = dto.Bcc;
            draft.Subject = dto.Subject;
            draft.BodyHtml = _sanitizer.Sanitize(dto.BodyHtml);
            draft.BodyText = _sanitizer.ToPlainText(draft.BodyHtml);
            draft.TemplateId = dto.TemplateId;
            draft.UpdatedAt = DateTime.UtcNow;

            await LinkAttachmentsAsync(draft.Id, dto.AttachmentIds, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            return await ToDtoAsync(draft, cancellationToken);
        }

        public async Task<bool> DiscardDraftAsync(Guid draftId, CancellationToken cancellationToken)
        {
            var draft = await _context.EmailMessages
                .Include(m => m.Attachments)
                .FirstOrDefaultAsync(m => m.Id == draftId && m.Status == EmailStatus.Draft, cancellationToken);

            if (draft == null)
            {
                return false;
            }

            foreach (var attachment in draft.Attachments)
            {
                await _attachmentStorage.DeleteAsync(attachment.StorageUrl, cancellationToken);
            }

            _context.EmailMessages.Remove(draft);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        public async Task<InboxAttachmentDto> UploadAttachmentAsync(IFormFile file, CancellationToken cancellationToken)
        {
            if (file.Length == 0)
            {
                throw new InboxOperationException("The uploaded file is empty.");
            }

            if (file.Length > InboxAttachmentPolicy.MaxSingleFileBytes)
            {
                throw new InboxOperationException("Attachment exceeds the 20 MB limit.");
            }

            if (InboxAttachmentPolicy.IsBlockedFilename(file.FileName))
            {
                throw new InboxOperationException("This file type is not allowed as an email attachment.");
            }

            var attachmentId = Guid.NewGuid();
            await using var stream = file.OpenReadStream();
            var uploaded = await _attachmentStorage.UploadAsync(attachmentId, file.FileName, file.ContentType, stream, cancellationToken);

            var attachment = new EmailAttachment
            {
                Id = attachmentId,
                MessageId = null,
                Filename = file.FileName,
                MimeType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                Size = uploaded.Size,
                StorageUrl = uploaded.StoragePath,
            };

            _context.EmailAttachments.Add(attachment);
            await _context.SaveChangesAsync(cancellationToken);

            return new InboxAttachmentDto
            {
                Id = attachment.Id,
                Filename = attachment.Filename,
                MimeType = attachment.MimeType,
                Size = attachment.Size,
                Url = await _attachmentStorage.GetSignedUrlAsync(attachment.StorageUrl, cancellationToken),
            };
        }

        private async Task LinkAttachmentsAsync(Guid messageId, List<Guid> attachmentIds, CancellationToken cancellationToken)
        {
            var currentlyLinked = await _context.EmailAttachments
                .Where(a => a.MessageId == messageId)
                .ToListAsync(cancellationToken);

            foreach (var attachment in currentlyLinked.Where(a => !attachmentIds.Contains(a.Id)))
            {
                attachment.MessageId = null;
            }

            if (attachmentIds.Count == 0)
            {
                return;
            }

            var toLink = await _context.EmailAttachments
                .Where(a => attachmentIds.Contains(a.Id) && a.MessageId == null)
                .ToListAsync(cancellationToken);

            foreach (var attachment in toLink)
            {
                attachment.MessageId = messageId;
            }
        }

        private static void ApplyPatch(EmailMessage message, PatchMessageDto dto)
        {
            if (dto.IsRead.HasValue) message.IsRead = dto.IsRead.Value;
            if (dto.IsStarred.HasValue) message.IsStarred = dto.IsStarred.Value;
            if (dto.IsArchived.HasValue)
            {
                message.IsArchived = dto.IsArchived.Value;
                if (dto.IsArchived.Value) message.IsDeleted = false;
            }
            if (dto.IsDeleted.HasValue) message.IsDeleted = dto.IsDeleted.Value;
            if (dto.Labels != null) message.Labels = dto.Labels;
            message.UpdatedAt = DateTime.UtcNow;
        }

        private async Task<EmailMessageDto> ToDtoAsync(EmailMessage m, CancellationToken cancellationToken)
        {
            var attachments = await _context.EmailAttachments
                .AsNoTracking()
                .Where(a => a.MessageId == m.Id)
                .ToListAsync(cancellationToken);

            var attachmentDtos = new List<InboxAttachmentDto>();
            foreach (var a in attachments)
            {
                attachmentDtos.Add(new InboxAttachmentDto
                {
                    Id = a.Id,
                    Filename = a.Filename,
                    MimeType = a.MimeType,
                    Size = a.Size,
                    Url = await _attachmentStorage.GetSignedUrlAsync(a.StorageUrl, cancellationToken),
                });
            }

            return new EmailMessageDto
            {
                Id = m.Id,
                Direction = m.Direction.ToString(),
                FromName = m.FromName,
                FromEmail = m.FromEmail,
                ToEmails = m.ToEmails,
                CcEmails = m.CcEmails,
                BccEmails = m.BccEmails,
                Subject = m.Subject,
                BodyHtml = m.BodyHtml,
                BodyText = m.BodyText,
                Status = m.Status.ToString(),
                ErrorMessage = m.ErrorMessage,
                IsRead = m.IsRead,
                IsStarred = m.IsStarred,
                Attachments = attachmentDtos,
                CreatedAt = m.CreatedAt,
                SentAt = m.SentAt,
                ReceivedAt = m.ReceivedAt,
            };
        }
    }
}
