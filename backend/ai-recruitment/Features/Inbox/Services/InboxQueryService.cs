using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Inbox.Services
{
    public class InboxQueryService : IInboxQueryService
    {
        private readonly AppDbContext _context;
        private readonly IInboxCandidateLinkService _candidateLink;
        private readonly IHtmlSanitizerService _sanitizer;
        private readonly IEmailAttachmentStorage _attachmentStorage;

        public InboxQueryService(
            AppDbContext context,
            IInboxCandidateLinkService candidateLink,
            IHtmlSanitizerService sanitizer,
            IEmailAttachmentStorage attachmentStorage)
        {
            _context = context;
            _candidateLink = candidateLink;
            _sanitizer = sanitizer;
            _attachmentStorage = attachmentStorage;
        }

        public async Task<InboxThreadListResponseDto> GetThreadsAsync(
            string folder,
            string? search,
            string filter,
            string? label,
            string sort,
            int page,
            int pageSize,
            CancellationToken cancellationToken)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var allMessages = await _context.EmailMessages
                .AsNoTracking()
                .Include(m => m.Attachments)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync(cancellationToken);

            var groups = allMessages
                .GroupBy(ThreadKey)
                .Select(g => new { Key = g.Key, Messages = g.OrderBy(m => m.CreatedAt).ToList() })
                .ToList();

            var candidatesByEmail = await ResolveCandidatesAsync(allMessages, cancellationToken);

            var filtered = new List<(string Key, List<EmailMessage> Messages, string Folder)>();
            foreach (var group in groups)
            {
                var latest = group.Messages[^1];
                var resolvedFolder = InboxFolders.Resolve(latest);

                var matchesFolder = folder == InboxFolders.Starred
                    ? resolvedFolder != InboxFolders.Trash && group.Messages.Any(m => m.IsStarred)
                    : resolvedFolder == folder;

                if (!matchesFolder)
                {
                    continue;
                }

                if (!MatchesFilter(group.Messages, filter, candidatesByEmail))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(label)
                    && !group.Messages.Any(m => m.Labels.Contains(label, StringComparer.OrdinalIgnoreCase)))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(search)
                    && !await MatchesSearchAsync(group.Messages, search, candidatesByEmail, cancellationToken))
                {
                    continue;
                }

                filtered.Add((group.Key, group.Messages, resolvedFolder));
            }

            filtered = sort == "oldest"
                ? filtered.OrderBy(t => t.Messages[^1].CreatedAt).ToList()
                : filtered.OrderByDescending(t => t.Messages[^1].CreatedAt).ToList();

            var total = filtered.Count;
            var page_ = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            var items = new List<InboxThreadListItemDto>();
            foreach (var (key, messages, _) in page_)
            {
                var latest = messages[^1];
                var participantEmails = CollectParticipantEmails(messages);
                var candidate = participantEmails
                    .Select(e => candidatesByEmail.TryGetValue(e, out var c) ? c : null)
                    .FirstOrDefault(c => c != null);

                items.Add(new InboxThreadListItemDto
                {
                    ThreadId = key,
                    Subject = messages[0].Subject,
                    SenderName = latest.FromName,
                    SenderEmail = latest.FromEmail,
                    Preview = Truncate(_sanitizer.ToPlainText(latest.BodyHtml), 160),
                    MessageCount = messages.Count,
                    UnreadCount = messages.Count(m => !m.IsRead && m.Direction == EmailDirection.Inbound),
                    IsStarred = messages.Any(m => m.IsStarred),
                    HasAttachments = messages.Any(m => m.Attachments.Count > 0),
                    Labels = messages.SelectMany(m => m.Labels).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                    LastActivityAt = latest.CreatedAt,
                    Candidate = candidate != null ? await _candidateLink.BuildCardAsync(candidate, cancellationToken) : null,
                });
            }

            return new InboxThreadListResponseDto
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<InboxCountsDto> GetCountsAsync(CancellationToken cancellationToken)
        {
            var allMessages = await _context.EmailMessages
                .AsNoTracking()
                .OrderBy(m => m.CreatedAt)
                .ToListAsync(cancellationToken);

            var groups = allMessages
                .GroupBy(ThreadKey)
                .Select(g => g.OrderBy(m => m.CreatedAt).ToList())
                .ToList();

            var folders = new Dictionary<string, int>
            {
                [InboxFolders.Sent] = 0,
                [InboxFolders.Drafts] = 0,
                [InboxFolders.Starred] = 0,
                [InboxFolders.Archived] = 0,
                [InboxFolders.Trash] = 0,
            };

            var inboxUnread = 0;
            var labels = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var messages in groups)
            {
                var latest = messages[^1];
                var folder = InboxFolders.Resolve(latest);

                if (folder == InboxFolders.Inbox)
                {
                    if (messages.Any(m => !m.IsRead && m.Direction == EmailDirection.Inbound))
                    {
                        inboxUnread++;
                    }
                }
                else
                {
                    folders[folder]++;
                }

                if (folder != InboxFolders.Trash && messages.Any(m => m.IsStarred))
                {
                    folders[InboxFolders.Starred]++;
                }

                if (folder == InboxFolders.Trash)
                {
                    continue;
                }

                foreach (var labelName in messages.SelectMany(m => m.Labels).Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    labels[labelName] = labels.GetValueOrDefault(labelName) + 1;
                }
            }

            folders[InboxFolders.Inbox] = inboxUnread;

            return new InboxCountsDto
            {
                Folders = folders,
                Labels = labels,
                TotalUnread = inboxUnread,
            };
        }

        public async Task<InboxThreadDto?> GetThreadAsync(string threadKey, CancellationToken cancellationToken)
        {
            var messages = await _context.EmailMessages
                .AsNoTracking()
                .Include(m => m.Attachments)
                .Where(m => m.GmailThreadId == threadKey || m.ThreadId.ToString() == threadKey)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync(cancellationToken);

            if (messages.Count == 0)
            {
                return null;
            }

            var participantEmails = CollectParticipantEmails(messages);
            var candidate = await _candidateLink.FindCandidateAsync(participantEmails, cancellationToken);

            var messageDtos = new List<EmailMessageDto>();
            foreach (var m in messages)
            {
                var attachmentDtos = new List<InboxAttachmentDto>();
                foreach (var a in m.Attachments)
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

                messageDtos.Add(new EmailMessageDto
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
                });
            }

            return new InboxThreadDto
            {
                ThreadId = threadKey,
                Subject = messages[0].Subject,
                Labels = messages.SelectMany(m => m.Labels).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                Messages = messageDtos,
                Candidate = candidate != null ? await _candidateLink.BuildCardAsync(candidate, cancellationToken) : null,
            };
        }

        private static string ThreadKey(EmailMessage m) => m.GmailThreadId ?? m.ThreadId.ToString();

        private static IReadOnlyList<string> CollectParticipantEmails(IEnumerable<EmailMessage> messages)
        {
            return messages
                .SelectMany(m => new[] { m.FromEmail }.Concat(m.ToEmails).Concat(m.CcEmails))
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private async Task<Dictionary<string, Candidates.model.Candidate>> ResolveCandidatesAsync(
            IEnumerable<EmailMessage> allMessages,
            CancellationToken cancellationToken)
        {
            var allEmails = CollectParticipantEmails(allMessages)
                .Select(e => e.ToLowerInvariant())
                .Distinct()
                .ToList();

            if (allEmails.Count == 0)
            {
                return new Dictionary<string, Candidates.model.Candidate>(StringComparer.OrdinalIgnoreCase);
            }

            var candidates = await _context.Candidates
                .AsNoTracking()
                .Where(c => allEmails.Contains(c.EmailAddress.ToLower()))
                .ToListAsync(cancellationToken);

            return candidates.ToDictionary(c => c.EmailAddress, c => c, StringComparer.OrdinalIgnoreCase);
        }

        private static bool MatchesFilter(
            List<EmailMessage> messages,
            string filter,
            Dictionary<string, Candidates.model.Candidate> candidatesByEmail)
        {
            return filter switch
            {
                "unread" => messages.Any(m => !m.IsRead && m.Direction == EmailDirection.Inbound),
                "attachments" => messages.Any(m => m.Attachments.Count > 0),
                "candidate_replies" => messages.Any(m =>
                    m.Direction == EmailDirection.Inbound && candidatesByEmail.ContainsKey(m.FromEmail)),
                _ => true,
            };
        }

        private Task<bool> MatchesSearchAsync(
            List<EmailMessage> messages,
            string search,
            Dictionary<string, Candidates.model.Candidate> candidatesByEmail,
            CancellationToken cancellationToken)
        {
            var needle = search.Trim();

            var matches = messages.Any(m =>
                Contains(m.Subject, needle)
                || Contains(m.BodyText, needle)
                || Contains(m.FromName, needle)
                || Contains(m.FromEmail, needle)
                || m.ToEmails.Any(e => Contains(e, needle)));

            if (!matches)
            {
                var participantEmails = CollectParticipantEmails(messages);
                matches = participantEmails
                    .Select(e => candidatesByEmail.TryGetValue(e, out var c) ? c : null)
                    .Any(c => c != null && Contains($"{c.FirstName} {c.LastName}", needle));
            }

            return Task.FromResult(matches);
        }

        private static bool Contains(string? haystack, string needle) =>
            !string.IsNullOrEmpty(haystack) && haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);

        private static string Truncate(string text, int maxLength) =>
            text.Length <= maxLength ? text : string.Concat(text.AsSpan(0, maxLength), "...");
    }
}
