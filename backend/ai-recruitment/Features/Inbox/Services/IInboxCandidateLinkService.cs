using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Inbox.Dto;

namespace ai_recruitment.Features.Inbox.Services
{
    // The one place the Inbox feature ever reads Candidate data - strictly read-only, used to
    // (a) show the sender/recipient card and (b) auto-apply a display label to an inbound
    // message. Never writes to Candidate/ApplicantStatus.
    public interface IInboxCandidateLinkService
    {
        // Case-insensitive match against Candidate.EmailAddress for any of the given addresses.
        Task<Candidate?> FindCandidateAsync(IEnumerable<string> emails, CancellationToken cancellationToken);

        Task<CandidateCardDto?> BuildCardAsync(Candidate candidate, CancellationToken cancellationToken);

        // Maps the candidate's CURRENT ApplicantStatus name to one of EmailLabels - read-only,
        // recomputed every time (never stored on Candidate).
        string ResolveLabelForStatus(string statusName);
    }
}
