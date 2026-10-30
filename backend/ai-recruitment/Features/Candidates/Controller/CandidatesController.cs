using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Services;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Candidates;
using ai_recruitment.Features.Candidates.Dto;
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

        public CandidatesController(
            AppDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<CandidatesController> logger,
            IScreeningRequestPublisher screeningRequestPublisher,
            ISupabaseStorageService supabaseStorageService,
            INotificationService notificationService,
            ICandidateStatusWebhookPublisher candidateStatusWebhookPublisher)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _screeningRequestPublisher = screeningRequestPublisher;
            _supabaseStorageService = supabaseStorageService;
            _notificationService = notificationService;
            _candidateStatusWebhookPublisher = candidateStatusWebhookPublisher;
        }


        [HttpPost]
        [Consumes("multipart/form-data")]
        [HasPermission(PermissionNames.Candidates.Create)]
        public async Task<IActionResult> CreateCandidate(
            [FromForm] CreateCandidateDto dto)
        {
            // Check if email already exists
            var existingCandidate = await _context.Candidates
                .FirstOrDefaultAsync(c => c.EmailAddress == dto.Email);

            if (existingCandidate != null)
            {
                return Conflict(new
                {
                    message = "A candidate with this email already exists."
                });
            }

            // The screening webhook depends entirely on the referenced Job existing, so
            // this is validated up front instead of letting a bad JobId surface later as
            // an FK violation on SaveChangesAsync. The title doubles as the "new applicant"
            // notification message content further down.
            var jobTitle = await _context.Jobs
                .Where(j => j.JobId == dto.JobId)
                .Select(j => j.JobTitle)
                .FirstOrDefaultAsync();

            if (jobTitle == null)
            {
                return BadRequest(new
                {
                    message = "The selected job could not be found."
                });
            }

            // Validate resume
            if (dto.Resume == null || dto.Resume.Length == 0)
            {
                return BadRequest(new
                {
                    message = "Resume is required."
                });
            }

            if (dto.Resume.Length > MaxResumeFileSize)
            {
                return BadRequest(new
                {
                    message = "Resume file size cannot exceed 5MB."
                });
            }

            var extension = Path.GetExtension(dto.Resume.FileName).ToLowerInvariant();

            // Buffered once (max 5MB) and reused for: the file-signature check below, the
            // Supabase upload, and the existing "candidate-created" webhook's multipart
            // attachment further down - IFormFile's own backing stream is only reliably
            // readable once per request.
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

            // Generated up front (rather than left to EF/Postgres) so it can be used to
            // build the Supabase storage path before the Candidate row exists.
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

            // Create candidate
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
                // The Supabase object path (bucket is config, not stored per-row) - not a
                // URL. Signed download URLs are generated on demand and never persisted.
                ResumeFilePath = storagePath,
                Role = dto.Role,
                JobId = dto.JobId,
                SourcOfApplication = dto.SourceOfApplication,

                // Initial status
                ApplicantStatusId = 1,

                CreatedAt = DateTime.UtcNow
            };

            _context.Candidates.Add(candidate);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                // Compensate: the resume already made it to Supabase, but the applicant
                // record didn't - don't leave an orphaned file or an incomplete record.
                _logger.LogError(ex, "Failed to save Candidate {CandidateId} after resume upload; cleaning up the uploaded resume.", candidateId);
                await _supabaseStorageService.DeleteAsync(_supabaseStorageService.ResumeBucket, storagePath);

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Failed to save your application. Please try again."
                });
            }


            // Candidate now has its generated ID because SaveChangesAsync() has completed.

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
                HttpContext.RequestAborted);

            // Dynamic AI screening: writes a durable outbox row (see ScreeningWebhookOutbox)
            // keyed off candidate.JobId and signals the background dispatcher to deliver it.
            // This never throws and never delays the response below - if n8n is unreachable,
            // the dispatcher retries later and the candidate submission still succeeds.
            await _screeningRequestPublisher.PublishAsync(candidate, HttpContext.RequestAborted);

            // Build multipart/form-data content to send candidate data + actual resume file
            var httpClient = _httpClientFactory.CreateClient();
            var webhookUrl = _configuration["N8n:applicationSubmittedWebhookUrl"];

            // Prepare form fields
            using var form = new MultipartFormDataContent();

            static HttpContent Field(string? value)
            {
                var c = new StringContent(value ?? string.Empty);
                c.Headers.ContentType = null; // n8n treats any part with a Content-Type as binary
                return c;
            }

            form.Add(Field(candidate.Id.ToString()), "candidateId");
            form.Add(Field(candidate.FirstName ?? string.Empty), "firstName");
            form.Add(Field(candidate.LastName ?? string.Empty), "lastName");
            form.Add(Field(candidate.EmailAddress ?? string.Empty), "email");
            form.Add(Field(candidate.PhoneNumber ?? string.Empty), "phoneNumber");
            form.Add(Field(candidate.YearsOfExperience.ToString()), "yearsOfExperience");
            form.Add(Field(candidate.PortfolioLink ?? string.Empty), "portfolioLink");
            form.Add(Field(candidate.CoverLetter ?? string.Empty), "coverLetter");
            form.Add(Field(candidate.ResumeFileName ?? string.Empty), "resumeFileName");
            form.Add(Field(candidate.Role ?? string.Empty), "role");
            form.Add(Field(candidate.SourcOfApplication ?? string.Empty), "sourceOfApplication");
            form.Add(Field(candidate.ApplicantStatusId.ToString()), "applicantStatusId");

            try
            {
                using var resumeStream = new MemoryStream(resumeBytes);
                var streamContent = new StreamContent(resumeStream);
                streamContent.Headers.ContentType = new MediaTypeHeaderValue(dto.Resume.ContentType);

                // 'resume' is the required multipart field name
                form.Add(streamContent, "resume", candidate.ResumeFileName!);

                // Post the multipart form
                HttpResponseMessage response;
                try
                {
                    response = await httpClient.PostAsync(webhookUrl, form);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to POST candidate resume to n8n webhook '{WebhookUrl}' for Candidate {CandidateId}", webhookUrl, candidate.Id);
                    // Do not fail the request - candidate already saved successfully
                    return CreatedAtAction(
                        nameof(GetCandidate),
                        new { id = candidate.Id },
                        candidate
                    );
                }

                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("n8n webhook returned non-success status {StatusCode} for Candidate {CandidateId}. Response body: {Body}", response.StatusCode, candidate.Id, body);
                }
                else
                {
                    _logger.LogInformation("Successfully posted candidate {CandidateId} to n8n webhook {WebhookUrl}", candidate.Id, webhookUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error attaching resume to n8n webhook request for Candidate {CandidateId}", candidate.Id);
            }

            return CreatedAtAction(
                nameof(GetCandidate),
                new { id = candidate.Id },
                candidate
            );
        }

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
        public async Task<IActionResult> GetAllCandidates([FromQuery] int? jobId, [FromQuery] int? pageNumber = 1, [FromQuery] int? pageSize = 10)
        {
            var query = _context.Candidates.AsNoTracking()
                        .AsQueryable();

            if (jobId.HasValue && jobId.Value != 0)
            {
                query = query.Where(c => c.JobId == jobId.Value);
            }

            query = query.OrderBy(c => c.CreatedAt);
            var totalCount = await query.CountAsync();

            // 3. Apply offset math and execute query
            var candidates = await query
                .Skip((pageNumber.GetValueOrDefault(1) - 1) * pageSize.GetValueOrDefault(10))
                .Take(pageSize.GetValueOrDefault(10))
                .OrderByDescending(c => c.CreatedAt)
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

            var query = _context.Candidates.AsNoTracking()
                        .Where(c => c.ApplicantStatusId == 1)
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

            //var newCandidates = await _context.Candidates
            //    .Where(c => c.ApplicantStatusId == 1)
            //    .Select(c => new NewCandidateListDto
            //    {
            //        CandidateId = c.Id,
            //        CandidateName = c.FirstName + " " + c.LastName,
            //        Position = c.Role,
            //        AppliedDate = c.CreatedAt,
            //        WorkExperience = c.YearsOfExperience.ToString(),
            //        ApplicationSource = c.SourcOfApplication
            //    })
            //    .ToListAsync();
            //return Ok(new
            //{
            //    Candidates = newCandidates,
            //    Status = 200
            //});
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
            if (dto.ApplicantStatusId.HasValue)
            {
                candidate.ApplicantStatusId = dto.ApplicantStatusId.Value;
            }

            if (dto.InterviewSched.HasValue)
            {
                candidate.InterviewSched = dto.InterviewSched.Value;
            }

            if (dto.InterviewerId.HasValue)
            {
                candidate.InterviewerId = dto.InterviewerId.Value;
            }

            candidate.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (dto.ApplicantStatusId.HasValue && dto.ApplicantStatusId.Value != previousStatusId)
            {
                var statusName = await _context.ApplicantStatuses
                    .Where(s => s.StatusId == dto.ApplicantStatusId.Value)
                    .Select(s => s.StatusName)
                    .FirstOrDefaultAsync() ?? "a new stage";

                await _notificationService.NotifyAsync(
                    NotificationType.CandidateStatusChanged,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Info,
                        Title = "Candidate Status Changed",
                        Message = $"{candidate.FirstName} {candidate.LastName} moved to {statusName}.",
                        CandidateId = candidate.Id,
                        JobId = candidate.JobId,
                    },
                    $"status:{candidate.Id}:{dto.ApplicantStatusId.Value}",
                    HttpContext.RequestAborted);

                // Candidate status-change emails (interview/offer/onboarding/rejection) via
                // n8n - only for the specific statuses CandidateStatusNotifications knows
                // about (the "a new stage" fallback above never matches that set). Enqueues
                // a durable outbox row and returns immediately; delivery happens on a
                // background dispatcher so a down/slow n8n can never delay or fail this
                // response.
                if (CandidateStatusNotifications.TryGetEmailType(statusName, out _))
                {
                    var previousStatusName = await _context.ApplicantStatuses
                        .Where(s => s.StatusId == previousStatusId)
                        .Select(s => s.StatusName)
                        .FirstOrDefaultAsync();

                    var changedBy = User.FindFirstValue(ClaimTypes.Name);

                    await _candidateStatusWebhookPublisher.PublishAsync(
                        candidate,
                        previousStatusName,
                        statusName,
                        changedBy,
                        HttpContext.RequestAborted);
                }
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
