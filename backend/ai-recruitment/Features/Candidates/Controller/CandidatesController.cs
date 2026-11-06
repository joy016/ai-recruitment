using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Services;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Candidates;
using ai_recruitment.Features.Candidates.Dto;
using ai_recruitment.Features.Candidates.Realtime;
using ai_recruitment.Features.Candidates.Services;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using ai_recruitment.Service;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Http.Headers;
using System.IO;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace ai_recruitment.Features.Candidates.controller

{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CandidatesController : ControllerBase
    {
        private const long MaxResumeFileSize = 5 * 1024 * 1024; // 5MB

        // Extension -> expected MIME type. Also doubles as the set of allowed extensions.
        private static readonly Dictionary<string, string> AllowedResumeContentTypesByExtension =
            new(StringComparer.OrdinalIgnoreCase)
            {
                [".pdf"] = "application/pdf",
                [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            };

        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CandidatesController> _logger;
        private readonly IScreeningRequestPublisher _screeningRequestPublisher;
        private readonly ISupabaseStorageService _supabaseStorageService;
        private readonly INotificationService _notificationService;
        private readonly ICandidateStatusWebhookPublisher _candidateStatusWebhookPublisher;
        private readonly ICandidateStatusChangeService _candidateStatusChangeService;
        private readonly ICandidateRealtimeNotifier _realtimeNotifier;

        public CandidatesController(
            AppDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<CandidatesController> logger,
            IScreeningRequestPublisher screeningRequestPublisher,
            ISupabaseStorageService supabaseStorageService,
            INotificationService notificationService,
            ICandidateStatusWebhookPublisher candidateStatusWebhookPublisher,
            ICandidateStatusChangeService candidateStatusChangeService,
            ICandidateRealtimeNotifier realtimeNotifier)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _screeningRequestPublisher = screeningRequestPublisher;
            _supabaseStorageService = supabaseStorageService;
            _notificationService = notificationService;
            _candidateStatusWebhookPublisher = candidateStatusWebhookPublisher;
            _candidateStatusChangeService = candidateStatusChangeService;
            _realtimeNotifier = realtimeNotifier;
        }


        [HttpPost]
        [Consumes("multipart/form-data")]
        [HasPermission(PermissionNames.Candidates.Create)]
        public async Task<IActionResult> CreateCandidate([FromForm] CreateCandidateDto dto)
        {
            // ---- 1. Cheap validation first (no DB / network) ----------------------
            if (dto.Resume == null || dto.Resume.Length == 0)
            {
                return BadRequest(new { message = "Resume is required." });
            }

            if (dto.Resume.Length > MaxResumeFileSize)
            {
                return BadRequest(new { message = "Resume file size cannot exceed 5MB." });
            }

            var extension = Path.GetExtension(dto.Resume.FileName).ToLowerInvariant();

            // Buffered once (max 5MB): reused for the signature check and the Supabase
            // upload. IFormFile's backing stream is only reliably readable once.
            byte[] resumeBytes;
            using (var buffer = new MemoryStream())
            {
                await dto.Resume.CopyToAsync(buffer);
                resumeBytes = buffer.ToArray();
            }

            if (!TryValidateResumeFile(dto.Resume, extension, resumeBytes, out var validationError))
            {
                return BadRequest(new { message = validationError });
            }

            // ---- 2. DB validation --------------------------------------------------
            var alreadyApplied = await _context.Candidates
                .AnyAsync(c => c.EmailAddress == dto.Email && c.JobId == dto.JobId);

            if (alreadyApplied)
            {
                return Conflict(new { message = "You have already applied for this job with this email address." });
            }

            // Screening depends on the Job existing; validate up front instead of
            // surfacing a bad JobId later as an FK violation. The title is also used
            // for the "new applicant" notification.
            var jobTitle = await _context.Jobs
                .Where(j => j.JobId == dto.JobId)
                .Select(j => j.JobTitle)
                .FirstOrDefaultAsync();

            if (jobTitle == null)
            {
                return BadRequest(new { message = "The selected job could not be found." });
            }

            var screeningStatusId = await _context.ApplicantStatuses
                .Where(s => s.StatusName == AiScreeningStatusMapper.ScreeningStatusName)
                .Select(s => (int?)s.StatusId)
                .FirstOrDefaultAsync() ?? 1;

            // ---- 3. Upload resume --------------------------------------------------
            // Generated up front so the storage path can be built before the row exists.
            var candidateId = Guid.NewGuid();
            var storagePath = $"candidates/{candidateId}/{Guid.NewGuid()}{extension}";

            try
            {
                using var uploadStream = new MemoryStream(resumeBytes);
                await _supabaseStorageService.UploadAsync(
                    _supabaseStorageService.ResumeBucket, storagePath, uploadStream, dto.Resume.ContentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload resume to Supabase storage for prospective Candidate {CandidateId}.", candidateId);
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = "Failed to upload resume. Please try again."
                });
            }

            // ---- 4. Save candidate -------------------------------------------------
            var candidate = new model.Candidate
            {
                Id = candidateId,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                EmailAddress = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                YearsOfExperience = dto.YearsOfExperience,
                LinkedInProfile = dto.LinkedInUrl,
                CoverLetter = dto.CoverLetter,
                ResumeFileName = dto.Resume.FileName,
                // Supabase object path (bucket is config), not a URL. Signed download
                // URLs are generated on demand and never persisted.
                ResumeFilePath = storagePath,
                Role = dto.Role,
                JobId = dto.JobId,
                SourcOfApplication = dto.SourceOfApplication,
                ApplicantStatusId = screeningStatusId, // Awaiting AI screening
                CreatedAt = DateTime.UtcNow
            };

            _context.Candidates.Add(candidate);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueEmailJobViolation(ex))
            {
                // Belt-and-suspenders for the app-level check above: a concurrent duplicate
                // submission that slipped past it is still caught here by the DB's unique
                // (EmailAddress, JobId) index.
                _logger.LogWarning(ex, "Duplicate candidate submission (email+job) for Candidate {CandidateId}; cleaning up the uploaded resume.", candidateId);
                await _supabaseStorageService.DeleteAsync(_supabaseStorageService.ResumeBucket, storagePath);

                return Conflict(new { message = "You have already applied for this job with this email address." });
            }
            catch (DbUpdateException ex)
            {
                // Compensate: the resume is in Supabase but the record isn't saved.
                _logger.LogError(ex, "Failed to save Candidate {CandidateId} after resume upload; cleaning up the uploaded resume.", candidateId);
                await _supabaseStorageService.DeleteAsync(_supabaseStorageService.ResumeBucket, storagePath);

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Failed to save your application. Please try again."
                });
            }

            // ---- 5. Post-save side effects ----------------------------------------
            // The candidate is saved, so nothing below may fail the request. We also use
            // CancellationToken.None: if the browser aborts (e.g. timeout), we still want
            // the notification and the screening outbox row to be written.

            try
            {
                await _notificationService.NotifyAsync(
                    NotificationType.NewApplicant,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Info,
                        Title = "New Applicant",
                        Message = $"{candidate.FirstName} {candidate.LastName} applied for {jobTitle}.",
                        CandidateId = candidate.Id,
                        JobId = candidate.JobId,
                    },
                    $"applicant:{candidate.Id}",
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send new-applicant notification for Candidate {CandidateId}.", candidate.Id);
            }

            try
            {
                // Writes a durable outbox row and signals the background dispatcher,
                // which calls the n8n screening webhook. Never blocks on n8n.
                var enqueued = await _screeningRequestPublisher.PublishAsync(candidate, CancellationToken.None);
                if (!enqueued)
                {
                    await FallbackToManualReviewAsync(candidate, CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to enqueue screening request for Candidate {CandidateId}.", candidate.Id);
                await FallbackToManualReviewAsync(candidate, CancellationToken.None);
            }

            // New row for the HR candidates list. Never throws; a fallback above may already have
            // pushed one via NotifyStatusChangedAsync - a duplicate refetch is harmless.
            await _realtimeNotifier.NotifyCandidateChangedAsync(candidate.Id, CancellationToken.None);

            return CreatedAtAction(nameof(GetCandidate), new { id = candidate.Id }, candidate);
        }

        // The candidate must never be silently lost just because the screening event
        // couldn't be enqueued - surface it under Manual Review instead.
        private async Task FallbackToManualReviewAsync(model.Candidate candidate, CancellationToken cancellationToken)
        {
            try
            {
                var manualReviewStatusId = await _context.ApplicantStatuses
                    .Where(s => s.StatusName == AiScreeningStatusMapper.ManualReviewStatusName)
                    .Select(s => (int?)s.StatusId)
                    .FirstOrDefaultAsync(cancellationToken);

                if (!manualReviewStatusId.HasValue)
                {
                    _logger.LogError("Manual Review status is not seeded; cannot fall back Candidate {CandidateId}.", candidate.Id);
                    return;
                }

                var previousStatusId = candidate.ApplicantStatusId;
                if (!_candidateStatusChangeService.StageStatusChange(candidate, manualReviewStatusId.Value))
                {
                    return;
                }

                await _context.SaveChangesAsync(cancellationToken);
                await _candidateStatusChangeService.NotifyStatusChangedAsync(
                    candidate, previousStatusId, manualReviewStatusId.Value, "System", cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fall back Candidate {CandidateId} to Manual Review after a screening-enqueue failure.", candidate.Id);
            }
        }

        private static bool IsUniqueEmailJobViolation(DbUpdateException ex) =>
            ex.InnerException is Npgsql.PostgresException pgEx
                && pgEx.SqlState == Npgsql.PostgresErrorCodes.UniqueViolation;

        [HttpGet("{id}")]
        [HasPermission(PermissionNames.Candidates.View)]
        public async Task<IActionResult> GetCandidate(Guid id)
        {
            var candidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.Id == id);

            if (candidate == null)
            {
                return NotFound(new
                {
                    message = "Candidate not found."
                });
            }

            return Ok(candidate);
        }

        // Backs the "View Resume" action in the Candidates module. The frontend only ever
        // supplies the candidate id - the storage path comes exclusively from the DB row,
        // never from the caller, so this can't be used to sign an arbitrary object path.
        [HttpGet("{id:guid}/resume-url")]
        [HasPermission(PermissionNames.Candidates.View)]
        public async Task<IActionResult> GetResumeUrl(Guid id)
        {
            var candidate = await _context.Candidates
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);

            if (candidate == null)
            {
                return NotFound(new { message = "Candidate not found." });
            }

            if (string.IsNullOrWhiteSpace(candidate.ResumeFilePath))
            {
                return NotFound(new { message = "This candidate has no uploaded resume." });
            }

            string signedUrl;
            try
            {
                signedUrl = await _supabaseStorageService.CreateSignedUrlAsync(
                    _supabaseStorageService.ResumeBucket,
                    candidate.ResumeFilePath,
                    _supabaseStorageService.ResumeSignedUrlExpirationSeconds);
            }
            catch (SupabaseObjectNotFoundException ex)
            {
                _logger.LogWarning(ex, "Resume object missing in Supabase storage for Candidate {CandidateId}.", id);
                return NotFound(new { message = "Resume file could not be found in storage." });
            }
            catch (Exception ex)
            {
                // Never surface the exception message (could include the bucket/path or
                // Supabase's own response body) back to the client.
                _logger.LogError(ex, "Failed to generate a signed resume URL for Candidate {CandidateId}.", id);
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = "Could not generate the resume link right now. Please try again."
                });
            }

            var extension = Path.GetExtension(candidate.ResumeFileName ?? candidate.ResumeFilePath).ToLowerInvariant();
            var contentType = AllowedResumeContentTypesByExtension.TryGetValue(extension, out var mime)
                ? mime
                : "application/octet-stream";

            // The response body carries a live, usable credential (the signed URL) - never
            // let it be cached by a proxy or the browser.
            Response.Headers.CacheControl = "no-store";

            return Ok(new ResumeUrlDto
            {
                Url = signedUrl,
                ExpiresAt = DateTime.UtcNow.AddSeconds(_supabaseStorageService.ResumeSignedUrlExpirationSeconds),
                FileName = candidate.ResumeFileName,
                ContentType = contentType,
            });
        }

        [HttpGet("getCandidates")]
        [HasPermission(PermissionNames.Candidates.View)]
        public async Task<IActionResult> GetAllCandidates([FromQuery] int? jobId, [FromQuery] int? statusId, [FromQuery] int? pageNumber = 1, [FromQuery] int? pageSize = 10)
        {
            var query = _context.Candidates.AsNoTracking()
                        .AsQueryable();

            if (jobId.HasValue && jobId.Value != 0)
            {
                query = query.Where(c => c.JobId == jobId.Value);
            }

            // Lets the "Needs Manual Review" tab (and similar status filters) page through
            // just that slice server-side instead of fetching everything and filtering client-side.
            if (statusId.HasValue)
            {
                query = query.Where(c => c.ApplicantStatusId == statusId.Value);
            }

            query = query.OrderByDescending(c => c.CreatedAt);
            var totalCount = await query.CountAsync();

            // 3. Apply offset math and execute query
            var candidates = await query
                .Skip((pageNumber.GetValueOrDefault(1) - 1) * pageSize.GetValueOrDefault(10))
                .Take(pageSize.GetValueOrDefault(10))
                .Select(c => new CandidateListDto
                {
                    Id = c.Id,
                    EmailAddress = c.EmailAddress,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    ApplicationDate = c.CreatedAt,
                    YearsOfExperience = c.YearsOfExperience.ToString(),
                    InterviewSched = c.InterviewSched,
                    ApplicantStatusId = c.ApplicantStatusId,
                    ResumePath = c.ResumeFilePath
                })
                .ToListAsync();

            // 4. Calculate total pages
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize.GetValueOrDefault(10));


            // 5. Return data along with page metadata

            return Ok(new
            {
                TotalCount = totalCount,
                TotalPages = totalPages,
                CurrentPage = pageNumber.GetValueOrDefault(1),
                PageSize = pageSize.GetValueOrDefault(10),
                Data = candidates,
            });

        }

        [HttpGet("getNewCandidates")]
        [HasPermission(PermissionNames.Candidates.View)]
        public async Task<IActionResult> GetNewCandidates([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            // "New" means awaiting AI screening. "Application Submitted" is kept alongside
            // "Screening" for candidates created before Screening became the initial status.
            var newApplicantStatusIds = await _context.ApplicantStatuses
                .Where(s => s.StatusName == AiScreeningStatusMapper.ScreeningStatusName || s.StatusName == "Application Submitted")
                .Select(s => s.StatusId)
                .ToListAsync();

            var query = _context.Candidates.AsNoTracking()
                        .Where(c => newApplicantStatusIds.Contains(c.ApplicantStatusId))
                        .AsQueryable();

            var totalCount = await query.CountAsync();

            var newCandidates = await query.Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new NewCandidateListDto
                {
                    CandidateId = c.Id,
                    CandidateName = c.FirstName + " " + c.LastName,
                    Position = c.Role,
                    AppliedDate = c.CreatedAt,
                    WorkExperience = c.YearsOfExperience.ToString(),
                    ApplicationSource = c.SourcOfApplication
                }).ToListAsync();

            return Ok(new
            {
                data = newCandidates,
                TotalCount = totalCount,
                pageNumber,
                pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        [HttpPut("updateCandidateStatus")]
        [HasPermission(PermissionNames.Candidates.Edit)]
        public async Task<IActionResult> UpdateCandidateStatus([FromBody] UpdateCandidateStatusDto dto)
        {
            var candidate = await _context.Candidates.FindAsync(dto.Id);
            if (candidate == null)
            {
                return NotFound();
            }

            var previousStatusId = candidate.ApplicantStatusId;

            // Supports partial updates: changing only the status, only the
            // interview schedule (e.g. correcting a date/time), or only
            // reassigning the interviewer - without requiring the others.
            var statusStaged = dto.ApplicantStatusId.HasValue
                && _candidateStatusChangeService.StageStatusChange(candidate, dto.ApplicantStatusId.Value);

            if (dto.InterviewSched.HasValue)
            {
                candidate.InterviewSched = dto.InterviewSched.Value;
            }

            if (dto.InterviewerId.HasValue)
            {
                candidate.InterviewerId = dto.InterviewerId.Value;
            }

            if (dto.JobOfferSched.HasValue)
            {
                candidate.JobOfferSched = dto.JobOfferSched.Value;
            }

            if (dto.JobOfferFacilitatorId.HasValue)
            {
                candidate.JobOfferFacilitatorId = dto.JobOfferFacilitatorId.Value;
            }

            if (dto.OnboardingSched.HasValue)
            {
                candidate.OnboardingSched = dto.OnboardingSched.Value;
            }

            if (dto.OnboardingFacilitatorId.HasValue)
            {
                candidate.OnboardingFacilitatorId = dto.OnboardingFacilitatorId.Value;
            }

            // StageStatusChange already set UpdatedAt when the status actually changed; for a
            // reschedule-only edit (no status change) it still needs to be bumped here.
            if (!statusStaged)
            {
                candidate.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            if (statusStaged)
            {
                // Enqueues a durable outbox row and returns immediately; delivery happens on
                // a background dispatcher so a down/slow n8n can never delay or fail this
                // response.
                var changedBy = User.FindFirstValue(ClaimTypes.Name);
                await _candidateStatusChangeService.NotifyStatusChangedAsync(
                    candidate,
                    previousStatusId,
                    dto.ApplicantStatusId!.Value,
                    changedBy,
                    HttpContext.RequestAborted);
            }
            else
            {
                // Schedule/interviewer/facilitator-only edit: NotifyStatusChangedAsync (which
                // pushes the realtime event) did not run, so push it here.
                await _realtimeNotifier.NotifyCandidateChangedAsync(candidate.Id, CancellationToken.None);
            }

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Candidate status updated successfully."
            });
        }

        [HttpGet("getCandidatesForInterviewToday")]
        [HasPermission(PermissionNames.Interviews.View)]
        public async Task<IActionResult> GetCandidatesForInterviewToday([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var query = _context.Candidates
                .AsNoTracking()
                .Where(c => c.InterviewSched != null
                    && c.InterviewSched >= today
                    && c.InterviewSched < tomorrow)
                .Join(_context.ApplicantStatuses,
                    c => c.ApplicantStatusId,
                    s => s.StatusId,
                    (c, s) => new InterviewTodayListDto
                    {
                        CandidateId = c.Id,
                        CandidateName = c.FirstName + " " + c.LastName,
                        PositionApplied = c.Role,
                        ApplicationStatus = s.StatusName,
                        InterviewTime = c.InterviewSched,
                        Interviewer = c.Interviewer != null
                            ? c.Interviewer.FirstName + " " + c.Interviewer.LastName
                            : null
                    });

            var totalCount = await query.CountAsync();

            var candidates = await query
                .OrderBy(c => c.InterviewTime)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            return Ok(new
            {
                data = candidates,
                totalCount,
                pageNumber,
                pageSize,
                totalPages
            });
        }

        [HttpDelete("{id:guid}")]
        [HasPermission(PermissionNames.Candidates.Delete)]
        public async Task<IActionResult> DeleteCandidate(Guid id)
        {
            var candidate = await _context.Candidates.FindAsync(id);
            if (candidate == null)
            {
                return NotFound(new
                {
                    message = "Candidate not found."
                });
            }

            _context.Candidates.Remove(candidate);
            await _context.SaveChangesAsync();

            await _realtimeNotifier.NotifyCandidateChangedAsync(id, CancellationToken.None);

            return NoContent();
        }

        private static bool TryValidateResumeFile(IFormFile resume, string extension, byte[] content, out string error)
        {
            error = string.Empty;

            if (!AllowedResumeContentTypesByExtension.TryGetValue(extension, out var expectedContentType))
            {
                error = "Only PDF and DOCX resume files are allowed.";
                return false;
            }

            if (!string.Equals(resume.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
            {
                error = $"The resume's content type does not match a {extension} file.";
                return false;
            }

            if (!HasValidFileSignature(extension, content))
            {
                error = "The resume file's content does not match its extension.";
                return false;
            }

            return true;
        }

        // Extension + declared Content-Type can both be spoofed by the client; this checks
        // the file's actual magic bytes so a renamed file can't masquerade as a PDF/DOCX.
        private static bool HasValidFileSignature(string extension, byte[] content)
        {
            if (extension == ".pdf")
            {
                // "%PDF"
                return content.Length >= 4
                    && content[0] == 0x25 && content[1] == 0x50 && content[2] == 0x44 && content[3] == 0x46;
            }

            if (extension == ".docx")
            {
                // .docx is an OOXML/ZIP container - standard ZIP local file header signature "PK\x03\x04".
                return content.Length >= 4
                    && content[0] == 0x50 && content[1] == 0x4B && content[2] == 0x03 && content[3] == 0x04;
            }

            return false;
        }
    }
}
