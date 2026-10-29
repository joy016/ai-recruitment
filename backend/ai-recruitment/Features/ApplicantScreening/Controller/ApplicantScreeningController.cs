using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Dto;
using ai_recruitment.Features.ApplicantScreening.Services;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.ApplicantScreening.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicantScreeningController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly N8nScreeningOptions _options;
        private readonly INotificationService _notificationService;
        private readonly ILogger<ApplicantScreeningController> _logger;

        public ApplicantScreeningController(
            AppDbContext context,
            IOptions<N8nScreeningOptions> options,
            INotificationService notificationService,
            ILogger<ApplicantScreeningController> logger)
        {
            _context = context;
            _options = options.Value;
            _notificationService = notificationService;
            _logger = logger;
        }

        // Called by the n8n "applicant-screening" workflow once it has an AI result (or
        // has given up). Authenticated with a shared secret header instead of a JWT,
        // since the caller is n8n, not a logged-in user - hence no [Authorize]/[HasPermission]
        // here. The AI score/recommendation are advisory only; this endpoint never touches
        // Candidate.ApplicantStatusId.
        [HttpPost("results")]
        [AllowAnonymous]
        public async Task<IActionResult> SubmitResults(
            [FromBody] SubmitScreeningResultDto dto,
            CancellationToken cancellationToken)
        {
            if (!IsCallbackAuthenticated(Request))
            {
                return Unauthorized(new { message = "Invalid or missing webhook secret." });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var candidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.Id == dto.CandidateId, cancellationToken);

            if (candidate == null)
            {
                return NotFound(new { message = "Candidate not found." });
            }

            // The candidate must actually have applied for the job the result is about -
            // otherwise a stale/forged callback could attach a screening to the wrong job.
            if (candidate.JobId != dto.JobId)
            {
                return UnprocessableEntity(new
                {
                    message = "Candidate did not apply for the supplied JobId."
                });
            }

            var matchedSkills = dto.MatchedSkills ?? [];
            var missingSkills = dto.MissingSkills ?? [];

            var existing = await _context.Set<Model.ApplicantScreening>()
                .FirstOrDefaultAsync(s => s.CandidateId == dto.CandidateId, cancellationToken);

            if (existing != null)
            {
                if (IsSameResult(existing, dto, matchedSkills, missingSkills))
                {
                    // Identical retry of a result we already stored (e.g. n8n's own retry
                    // after a dropped response) - acknowledge without writing again. No
                    // notification either: nothing about the result actually changed.
                    return Ok(new { message = "Screening result already recorded.", duplicate = true });
                }

                existing.QualificationScore = dto.QualificationScore;
                existing.MatchedSkills = matchedSkills;
                existing.MissingSkills = missingSkills;
                existing.Recommendation = dto.Recommendation;
                existing.Summary = dto.Summary;
                existing.ScreeningStatus = dto.ScreeningStatus;
                existing.ScreenedAt = dto.ScreenedAt;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.Set<Model.ApplicantScreening>().Add(new Model.ApplicantScreening
                {
                    Id = Guid.NewGuid(),
                    CandidateId = dto.CandidateId,
                    JobId = dto.JobId,
                    QualificationScore = dto.QualificationScore,
                    MatchedSkills = matchedSkills,
                    MissingSkills = missingSkills,
                    Recommendation = dto.Recommendation,
                    Summary = dto.Summary,
                    ScreeningStatus = dto.ScreeningStatus,
                    ScreenedAt = dto.ScreenedAt,
                });
            }

            await _context.SaveChangesAsync(cancellationToken);

            await NotifyScreeningResultAsync(candidate, dto, cancellationToken);

            return Ok(new { message = "Screening result saved." });
        }

        // The DTO's ScreeningStatus has no distinct pass/fail value within "completed" (see
        // SubmitScreeningResultDto) - COMPLETED/MANUAL_REVIEW_REQUIRED/UNREADABLE_RESUME is the
        // full set n8n sends today. Mapped as: COMPLETED -> Passed, MANUAL_REVIEW_REQUIRED ->
        // NeedsReview, UNREADABLE_RESUME -> Failed. If COMPLETED should itself split into
        // pass/fail (e.g. by QualificationScore or Recommendation), that needs a rule from
        // product/n8n first - flagging rather than guessing a threshold.
        private async Task NotifyScreeningResultAsync(
            Candidate candidate,
            SubmitScreeningResultDto dto,
            CancellationToken cancellationToken)
        {
            var (type, severity) = dto.ScreeningStatus switch
            {
                "COMPLETED" => (NotificationType.AiScreeningPassed, NotificationSeverity.Success),
                "MANUAL_REVIEW_REQUIRED" => (NotificationType.AiScreeningNeedsReview, NotificationSeverity.Warning),
                "UNREADABLE_RESUME" => (NotificationType.AiScreeningFailed, NotificationSeverity.Warning),
                _ => (NotificationType.AiScreeningNeedsReview, NotificationSeverity.Warning),
            };

            var jobTitle = await _context.Jobs
                .AsNoTracking()
                .Where(j => j.JobId == dto.JobId)
                .Select(j => j.JobTitle)
                .FirstOrDefaultAsync(cancellationToken) ?? "the role";

            var candidateName = $"{candidate.FirstName} {candidate.LastName}";
            var title = type switch
            {
                NotificationType.AiScreeningPassed => "AI Screening Passed",
                NotificationType.AiScreeningNeedsReview => "AI Screening Needs Review",
                NotificationType.AiScreeningFailed => "AI Screening Failed",
                _ => "AI Screening Update",
            };
            var message = type switch
            {
                NotificationType.AiScreeningPassed => $"{candidateName} passed AI screening for {jobTitle}.",
                NotificationType.AiScreeningNeedsReview => $"{candidateName} needs manual review for {jobTitle}.",
                NotificationType.AiScreeningFailed => $"AI screening could not be completed for {candidateName}'s application for {jobTitle}.",
                _ => $"AI screening updated for {candidateName} for {jobTitle}.",
            };

            var screenedAtKey = dto.ScreenedAt?.ToString("O") ?? "unscored";

            await _notificationService.NotifyAsync(
                type,
                new NotificationContext
                {
                    Severity = severity,
                    Title = title,
                    Message = message,
                    CandidateId = candidate.Id,
                    JobId = dto.JobId,
                },
                $"screening:{candidate.Id}:{screenedAtKey}",
                cancellationToken);
        }

        // Lets HR review the AI's advisory result for a candidate. Reuses the existing
        // Candidates.View permission rather than introducing a new one for a single
        // read endpoint.
        [HttpGet("{candidateId:guid}")]
        [HasPermission(PermissionNames.Candidates.View)]
        public async Task<IActionResult> GetResult(Guid candidateId, CancellationToken cancellationToken)
        {
            var result = await _context.Set<Model.ApplicantScreening>()
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.CandidateId == candidateId, cancellationToken);

            if (result == null)
            {
                return NotFound(new { message = "No screening result for this candidate yet." });
            }

            return Ok(result);
        }

        private bool IsCallbackAuthenticated(HttpRequest request)
        {
            if (string.IsNullOrWhiteSpace(_options.CallbackSecret))
            {
                _logger.LogError("{Key} is not configured; rejecting all screening-result callbacks.", N8nScreeningOptions.EnvCallbackSecret);
                return false;
            }

            if (!request.Headers.TryGetValue(_options.SecretHeaderName, out var provided))
            {
                return false;
            }

            var expectedBytes = System.Text.Encoding.UTF8.GetBytes(_options.CallbackSecret);
            var providedBytes = System.Text.Encoding.UTF8.GetBytes(provided.ToString());

            return expectedBytes.Length == providedBytes.Length
                && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);
        }

        private static bool IsSameResult(
            Model.ApplicantScreening existing,
            SubmitScreeningResultDto dto,
            string[] matchedSkills,
            string[] missingSkills)
        {
            return existing.ScreeningStatus == dto.ScreeningStatus
                && existing.QualificationScore == dto.QualificationScore
                && existing.Recommendation == dto.Recommendation
                && existing.Summary == dto.Summary
                && existing.ScreenedAt == dto.ScreenedAt
                && existing.MatchedSkills.SequenceEqual(matchedSkills)
                && existing.MissingSkills.SequenceEqual(missingSkills);
        }
    }
}
