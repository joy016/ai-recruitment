using ai_recruitment.Features.JobPosts.Dto;

namespace ai_recruitment.Features.JobPosts.Services
{
    public interface IApplicationEmailService
    {
        Task<bool> SendApplicationLinkAsync(ApplicationFormPayload dto);
    }
}
