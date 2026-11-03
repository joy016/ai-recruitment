using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    public interface IEmailTemplateService
    {
        Task<List<EmailTemplateDto>> GetActiveTemplatesAsync(CancellationToken cancellationToken);
        Task<EmailTemplateDto?> GetByKeyAsync(string key, CancellationToken cancellationToken);

        Task<RenderTemplateResponseDto?> RenderAsync(
            string key,
            RenderTemplateRequestDto request,
            CancellationToken cancellationToken);

        Task<EmailTemplateDto> CreateAsync(CreateEmailTemplateDto dto, CancellationToken cancellationToken);
        Task<EmailTemplateDto?> UpdateAsync(Guid id, UpdateEmailTemplateDto dto, CancellationToken cancellationToken);
        Task<bool> SoftDeleteAsync(Guid id, CancellationToken cancellationToken);

        // Insert-only upsert-by-key: never overwrites a template HR has already edited.
        // Called once at startup (see Program.cs), after migrations are applied.
        Task SeedDefaultsAsync(CancellationToken cancellationToken);
    }
}
