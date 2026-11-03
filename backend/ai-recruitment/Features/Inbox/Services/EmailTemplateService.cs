using System.Text.RegularExpressions;
using ai_recruitment.Data;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Inbox.Services
{
    public partial class EmailTemplateService : IEmailTemplateService
    {
        // {{var}} or {{var|fallback}}. The fallback text itself is authored directly into the
        // seeded templates (e.g. {{recipient_first_name|there}}) rather than hardcoded here, so
        // a new token never needs a code change to get a safe default.
        [GeneratedRegex(@"\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}")]
        private static partial Regex TokenPattern();

        private readonly AppDbContext _context;
        private readonly IHtmlSanitizerService _sanitizer;
        private readonly ILogger<EmailTemplateService> _logger;

        public EmailTemplateService(AppDbContext context, IHtmlSanitizerService sanitizer, ILogger<EmailTemplateService> logger)
        {
            _context = context;
            _sanitizer = sanitizer;
            _logger = logger;
        }

        public async Task<List<EmailTemplateDto>> GetActiveTemplatesAsync(CancellationToken cancellationToken)
        {
            return await _context.EmailTemplates
                .AsNoTracking()
                .Where(t => t.IsActive)
                .OrderBy(t => t.SortOrder)
                .Select(t => ToDto(t))
                .ToListAsync(cancellationToken);
        }

        public async Task<EmailTemplateDto?> GetByKeyAsync(string key, CancellationToken cancellationToken)
        {
            var template = await _context.EmailTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Key == key, cancellationToken);

            return template == null ? null : ToDto(template);
        }

        public async Task<RenderTemplateResponseDto?> RenderAsync(
            string key,
            RenderTemplateRequestDto request,
            CancellationToken cancellationToken)
        {
            var template = await _context.EmailTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Key == key && t.IsActive, cancellationToken);

            if (template == null)
            {
                return null;
            }

            var vars = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (request.ExtraVars != null)
            {
                foreach (var (varName, value) in request.ExtraVars)
                {
                    vars[varName] = value;
                }
            }

            if (!string.IsNullOrWhiteSpace(request.RecipientName))
            {
                var trimmedName = request.RecipientName.Trim();
                vars.TryAdd("recipient_name", trimmedName);
                vars.TryAdd("recipient_first_name", trimmedName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? trimmedName);
            }

            return new RenderTemplateResponseDto
            {
                Subject = Render(template.Subject, vars),
                BodyHtml = Render(template.BodyHtml, vars),
            };
        }

        // Public so InboxSendService can reuse it when a Compose/Send references a templateId
        // without going through the /render endpoint first.
        public static string Render(string text, IReadOnlyDictionary<string, string> vars)
        {
            var rendered = TokenPattern().Replace(text, match =>
            {
                var varName = match.Groups[1].Value;
                var fallback = match.Groups[2].Success ? match.Groups[2].Value : string.Empty;

                if (vars.TryGetValue(varName, out var value) && !string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }

                return fallback;
            });

            // Defensive: a token with no match at all (not even a fallback, e.g. a one-off
            // {{typo}}) must never leak to the client as literal "{{...}}" or "undefined".
            rendered = TokenPattern().Replace(rendered, string.Empty);
            return rendered.Replace("undefined", string.Empty);
        }

        public async Task<EmailTemplateDto> CreateAsync(CreateEmailTemplateDto dto, CancellationToken cancellationToken)
        {
            var template = new EmailTemplate
            {
                Id = Guid.NewGuid(),
                Key = dto.Key.Trim(),
                Name = dto.Name.Trim(),
                Subject = dto.Subject.Trim(),
                BodyHtml = _sanitizer.Sanitize(dto.BodyHtml),
                Variables = dto.Variables ?? [],
                SortOrder = dto.SortOrder,
            };
            template.BodyText = _sanitizer.ToPlainText(template.BodyHtml);

            _context.EmailTemplates.Add(template);
            await _context.SaveChangesAsync(cancellationToken);

            return ToDto(template);
        }

        public async Task<EmailTemplateDto?> UpdateAsync(Guid id, UpdateEmailTemplateDto dto, CancellationToken cancellationToken)
        {
            var template = await _context.EmailTemplates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
            if (template == null)
            {
                return null;
            }

            if (dto.Name != null) template.Name = dto.Name.Trim();
            if (dto.Subject != null) template.Subject = dto.Subject.Trim();
            if (dto.BodyHtml != null)
            {
                template.BodyHtml = _sanitizer.Sanitize(dto.BodyHtml);
                template.BodyText = _sanitizer.ToPlainText(template.BodyHtml);
            }
            if (dto.Variables != null) template.Variables = dto.Variables;
            if (dto.SortOrder.HasValue) template.SortOrder = dto.SortOrder.Value;
            if (dto.IsActive.HasValue) template.IsActive = dto.IsActive.Value;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return ToDto(template);
        }

        public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken)
        {
            var updated = await _context.EmailTemplates
                .Where(t => t.Id == id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.IsActive, false)
                    .SetProperty(t => t.UpdatedAt, DateTime.UtcNow), cancellationToken);

            return updated > 0;
        }

        public async Task SeedDefaultsAsync(CancellationToken cancellationToken)
        {
            var existingKeys = await _context.EmailTemplates
                .Select(t => t.Key)
                .ToListAsync(cancellationToken);

            var missing = EmailTemplateSeedData.Defaults
                .Where(t => !existingKeys.Contains(t.Key, StringComparer.OrdinalIgnoreCase))
                .ToList();

            if (missing.Count == 0)
            {
                return;
            }

            foreach (var seed in missing)
            {
                var bodyHtml = _sanitizer.Sanitize(seed.BodyHtml);
                _context.EmailTemplates.Add(new EmailTemplate
                {
                    Id = Guid.NewGuid(),
                    Key = seed.Key,
                    Name = seed.Name,
                    Subject = seed.Subject,
                    BodyHtml = bodyHtml,
                    BodyText = _sanitizer.ToPlainText(bodyHtml),
                    Variables = seed.Variables,
                    SortOrder = seed.SortOrder,
                });
            }

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Seeded {Count} default email template(s): {Keys}.", missing.Count, string.Join(", ", missing.Select(t => t.Key)));
        }

        private static EmailTemplateDto ToDto(EmailTemplate t) => new()
        {
            Id = t.Id,
            Key = t.Key,
            Name = t.Name,
            Subject = t.Subject,
            BodyHtml = t.BodyHtml,
            Variables = t.Variables,
            SortOrder = t.SortOrder,
            IsActive = t.IsActive,
        };
    }
}
