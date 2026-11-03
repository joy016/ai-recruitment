using ai_recruitment.Data;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Inbox.Dto;
using ai_recruitment.Features.Inbox.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Inbox.Services
{
    public class InboxCandidateLinkService : IInboxCandidateLinkService
    {
        private readonly AppDbContext _context;

        public InboxCandidateLinkService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Candidate?> FindCandidateAsync(IEnumerable<string> emails, CancellationToken cancellationToken)
        {
            var normalized = emails
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Select(e => e.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            if (normalized.Count == 0)
            {
                return null;
            }

            return await _context.Candidates
                .AsNoTracking()
                .FirstOrDefaultAsync(c => normalized.Contains(c.EmailAddress.ToLower()), cancellationToken);
        }

        public async Task<CandidateCardDto?> BuildCardAsync(Candidate candidate, CancellationToken cancellationToken)
        {
            var jobTitle = await _context.Jobs
                .AsNoTracking()
                .Where(j => j.JobId == candidate.JobId)
                .Select(j => (string?)j.JobTitle)
                .FirstOrDefaultAsync(cancellationToken);

            var statusName = await _context.ApplicantStatuses
                .AsNoTracking()
                .Where(s => s.StatusId == candidate.ApplicantStatusId)
                .Select(s => s.StatusName)
                .FirstOrDefaultAsync(cancellationToken) ?? "Unknown";

            return new CandidateCardDto
            {
                Id = candidate.Id,
                FullName = $"{candidate.FirstName} {candidate.LastName}".Trim(),
                JobAppliedFor = jobTitle,
                YearsOfExperience = candidate.YearsOfExperience,
                Status = statusName,
                InterviewSchedule = candidate.InterviewSched,
            };
        }

        public string ResolveLabelForStatus(string statusName)
        {
            if (statusName.Contains("Interview", StringComparison.OrdinalIgnoreCase))
            {
                return EmailLabels.Interviews;
            }

            if (statusName.Contains("Reject", StringComparison.OrdinalIgnoreCase))
            {
                return EmailLabels.Rejections;
            }

            if (statusName.Contains("Offer", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("Onboarding", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("Background Check", StringComparison.OrdinalIgnoreCase))
            {
                return EmailLabels.Offers;
            }

            return EmailLabels.Applicants;
        }
    }
}
