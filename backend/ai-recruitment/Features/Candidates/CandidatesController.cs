using ai_recruitment.Data;
using ai_recruitment.Features.Candidates;
using ai_recruitment.Features.Candidates.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AI_Recruitment.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CandidatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public CandidatesController(
            AppDbContext context,
            IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
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

            // Allowed file extensions
            var allowedExtensions = new[]
            {
                ".pdf",
                ".doc",
                ".docx"
            };

            var extension =
                Path.GetExtension(dto.Resume.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    message = "Only PDF, DOC, and DOCX files are allowed."
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
            var candidate = new Candidate
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

                // Initial status
                ApplicantStatusId = 1,

                CreatedAt = DateTime.UtcNow
            };

            _context.Candidates.Add(candidate);

            await _context.SaveChangesAsync();

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

        [HttpGet]
        public async Task<IActionResult> GetAllCandidates()
        {
            
            var candidates = await _context.Candidates
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
            return Ok(candidates);  
        }
    }
}