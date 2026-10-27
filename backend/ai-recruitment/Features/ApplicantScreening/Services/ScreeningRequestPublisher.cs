using System.Text.Json;
using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Dto;
using ai_recruitment.Features.ApplicantScreening.Model;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Service;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.ApplicantScreening.Services
{
    public class ScreeningRequestPublisher : IScreeningRequestPublisher
    {
        private readonly AppDbContext _context;
        private readonly ISupabaseStorageService _supabaseStorageService;
        private readonly ScreeningOutboxChannel _channel;
        private readonly ILogger<ScreeningRequestPublisher> _logger;

        public ScreeningRequestPublisher(
            AppDbContext context,
            ISupabaseStorageService supabaseStorageService,
            ScreeningOutboxChannel channel,
            ILogger<ScreeningRequestPublisher> logger)
        {
            _context = context;
            _supabaseStorageService = supabaseStorageService;
            _channel = channel;
            _logger = logger;
        }

        public async Task PublishAsync(Candidate candidate, CancellationToken cancellationToken = default)
        {
            try
            {
                // Dynamically retrieved from Postgres via candidate.JobId - the only
                // place job requirements come from. No per-title branching anywhere here.
                var job = await _context.Jobs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(j => j.JobId == candidate.JobId, cancellationToken);

                if (job == null)
                {
                    _logger.LogError(
                        "Cannot publish applicant-screening event: Job {JobId} referenced by Candidate {CandidateId} was not found.",
                        candidate.JobId, candidate.Id);
                    return;
                }

                if (job.Qualifications.Length == 0)
                {
                    _logger.LogWarning("Job {JobId} has no Qualifications on file; sending an empty list rather than a fabricated default.", job.JobId);
                }

                if (job.TechSkills.Length == 0)
                {
                    _logger.LogWarning("Job {JobId} has no TechSkills on file; sending an empty list rather than a fabricated default.", job.JobId);
                }

                if (string.IsNullOrWhiteSpace(candidate.ResumeFilePath))
                {
                    _logger.LogWarning(
                        "Candidate {CandidateId} has no ResumeFilePath on file; screening payload will omit resume.filePath/downloadUrl.",
                        candidate.Id);
                }

                // Generated up front so it can be stamped into the payload itself: the
                // dispatcher resends this exact serialized payload verbatim on every retry,
                // so n8n always sees the same idempotency key for one submission.
                var idempotencyKey = Guid.NewGuid();

                var payload = new ApplicantScreeningWebhookPayload
                {
                    IdempotencyKey = idempotencyKey,
                    CandidateId = candidate.Id,
                    JobId = job.JobId,
                    Candidate = new CandidateWebhookDto
                    {
                        FirstName = candidate.FirstName,
                        LastName = candidate.LastName,
                        Email = candidate.EmailAddress,
                        PhoneNumber = candidate.PhoneNumber,
                        YearsOfExperience = candidate.YearsOfExperience,
                        LinkedInProfile = candidate.LinkedInProfile,
                        CoverLetter = candidate.CoverLetter,
                    },
                    Job = new JobRequirementsWebhookDto
                    {
                        JobId = job.JobId,
                        Title = job.JobTitle,
                        Description = job.JobDescription,
                        Department = job.Department,
                        JobType = job.JobType,
                        Location = job.Location,
                        Qualifications = job.Qualifications,
                        TechnicalSkills = job.TechSkills,
                    },
                    // DownloadUrl is intentionally left null - it is a Supabase signed URL
                    // generated fresh at send time (see N8nApplicantScreeningWebhookService),
                    // never baked into the stored outbox payload.
                    Resume = new ResumeWebhookDto
                    {
                        FileName = candidate.ResumeFileName,
                        Bucket = _supabaseStorageService.ResumeBucket,
                        FilePath = candidate.ResumeFilePath ?? string.Empty,
                    },
                    SubmittedAt = candidate.CreatedAt,
                };

                var outboxEntry = new ScreeningWebhookOutbox
                {
                    Id = idempotencyKey,
                    CandidateId = candidate.Id,
                    JobId = job.JobId,
                    Payload = JsonSerializer.Serialize(payload),
                    Status = "Pending",
                };

                _context.Set<ScreeningWebhookOutbox>().Add(outboxEntry);
                await _context.SaveChangesAsync(cancellationToken);

                // Fire-and-forget nudge; the periodic sweep in ScreeningOutboxDispatcher
                // still picks this row up even if nobody is listening right now.
                _channel.SignalPending(outboxEntry.Id);
            }
            catch (Exception ex)
            {
                // Never let a screening-publish failure fail the candidate submission that
                // already succeeded.
                _logger.LogError(ex, "Failed to enqueue applicant-screening event for Candidate {CandidateId}.", candidate.Id);
            }
        }
    }
}
