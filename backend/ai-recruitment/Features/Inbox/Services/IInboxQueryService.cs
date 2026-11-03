using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    public interface IInboxQueryService
    {
        Task<InboxThreadListResponseDto> GetThreadsAsync(
            string folder,
            string? search,
            string filter,
            string? label,
            string sort,
            int page,
            int pageSize,
            CancellationToken cancellationToken);

        Task<InboxCountsDto> GetCountsAsync(CancellationToken cancellationToken);

        Task<InboxThreadDto?> GetThreadAsync(string threadKey, CancellationToken cancellationToken);
    }
}
