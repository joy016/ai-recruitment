using ai_recruitment.Data;
using ai_recruitment.Features.Candidates;
using ai_recruitment.Features.Candidates.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Http.Headers;
using System.IO;

namespace ai_recruitment.Features.Candidates.controller

{
    [ApiController]
    [Route("api/[controller]")]
    public class CandidatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CandidatesController> _logger;

        public CandidatesController(
            AppDbContext context,
            IWebHostEnvironment environment, IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<CandidatesController> logger)
        {
            _context = context;
            _environment = environment;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }
     

        [HttpPost]
        [Consumes("multipart/form-data")]
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

            // Validate resume
            if (dto.Resume == null || dto.Resume.Length == 0)
            {
                return BadRequest(new
                {
                    message = "Resume is required."
                });
            }

            var extension =
                Path.GetExtension(dto.Resume.FileName).ToLowerInvariant();

            if (extension != ".pdf")
            {
                return BadRequest(new
                {
                    message = "Only PDF resume files are allowed."
                });
            }

            // 5MB limit
            const long maxFileSize = 5 * 1024 * 1024;

            if (dto.Resume.Length > maxFileSize)
            {
                return BadRequest(new
                {
                    message = "Resume file size cannot exceed 5MB."
                });
            }

            // Create resume upload directory
            var uploadsFolder = Path.Combine(
                _environment.WebRootPath ?? "wwwroot",
                "uploads",
                "resumes"
            );

            Directory.CreateDirectory(uploadsFolder);

            // Generate unique filename
            var uniqueFileName =
                $"{Guid.NewGuid()}{extension}";

            var filePath = Path.Combine(
                uploadsFolder,
                uniqueFileName
            );

            // Save file
            await using (var stream = new FileStream(
                filePath,
                FileMode.Create))
            {
                await dto.Resume.CopyToAsync(stream);
            }

            // Create candidate
            var candidate = new model.Candidate
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                EmailAddress = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                YearsOfExperience = dto.YearsOfExperience,
                LinkedInProfile = dto.LinkedInUrl,
                CoverLetter = dto.CoverLetter,
                ResumeFileName = dto.Resume.FileName,
                ResumeFilePath = $"/uploads/resumes/{uniqueFileName}",
                Role = dto.Role,
                JobId = dto.JobId,
                SourcOfApplication = dto.SourceOfApplication,

                // Initial status
                ApplicantStatusId = 1,

                CreatedAt = DateTime.UtcNow
            };

            _context.Candidates.Add(candidate);

            await _context.SaveChangesAsync();


            // Candidate now has its generated ID because SaveChangesAsync() has completed.

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

            // Resolve physical path to the saved resume
            var webRoot = _environment.WebRootPath ?? "wwwroot";
            var relativePath = (candidate.ResumeFilePath ?? string.Empty).TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var physicalPath = Path.Combine(webRoot, relativePath);

            if (!string.IsNullOrWhiteSpace(relativePath) && System.IO.File.Exists(physicalPath))
            {
                try
                {
                    await using var fileStream = System.IO.File.OpenRead(physicalPath);
                    var streamContent = new StreamContent(fileStream);
                    streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");

                    // 'resume' is the required multipart field name
                    form.Add(streamContent, "resume", candidate.ResumeFileName);

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
                    _logger.LogError(ex, "Error reading resume file at path {Path} for Candidate {CandidateId}", physicalPath, candidate.Id);
                }
            }
            else
            {
                _logger.LogWarning("Resume file not found at path {Path} for Candidate {CandidateId}. Skipping webhook file upload.", physicalPath, candidate.Id);

                // Still attempt to call webhook with form fields only (without binary)
                try
                {
                    var response = await httpClient.PostAsync(webhookUrl, form);
                    if (!response.IsSuccessStatusCode)
                    {
                        var body = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("n8n webhook returned non-success status {StatusCode} for Candidate {CandidateId} when sending form-only. Response body: {Body}", response.StatusCode, candidate.Id, body);
                    }
                    else
                    {
                        _logger.LogInformation("Successfully posted candidate (form-only) {CandidateId} to n8n webhook {WebhookUrl}", candidate.Id, webhookUrl);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to POST candidate (form-only) to n8n webhook '{WebhookUrl}' for Candidate {CandidateId}", webhookUrl, candidate.Id);
                }
            }

            return CreatedAtAction(
                nameof(GetCandidate),
                new { id = candidate.Id },
                candidate
            );
        }

        [HttpGet("{id}")]
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

        [HttpGet("getCandidates")]
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
        public async Task<IActionResult> UpdateCandidateStatus([FromBody] UpdateCandidateStatusDto dto)
        {
            var candidate = await _context.Candidates.FindAsync(dto.Id);
            if (candidate == null)
            {
                return NotFound();
            }

            candidate.ApplicantStatusId = dto.ApplicantStatusId;
            candidate.InterviewSched = dto.InterviewSched;
            candidate.UpdatedAt = dto.UpdatedAt;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Candidate status updated successfully."
            });
        }
    }
}