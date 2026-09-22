using ai_recruitment.Data;
using ai_recruitment.Features.ApplicationStatuses.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ai_recruitment.Features.ApplicationStatuses.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicantStatusController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ApplicantStatusController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/ApplicantStatus
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ApplicantStatusDto>>> GetStatuses()
        {
            var statuses = await _context.ApplicantStatuses
                .OrderBy(s => s.SortOrder)
                .Select(s => new ApplicantStatusDto
                {
                    StatusId = s.StatusId,
                    StatusName = s.StatusName,
                    Description = s.Description,
                    Color = s.Color,
                    SortOrder = s.SortOrder,
                    IsActive = s.IsActive,
                    CreatedAt = s.CreatedAt
                })
                .ToListAsync();

            return Ok(statuses);
        }

        [HttpGet("interview")]
        public async Task<ActionResult<List<CandidateForInterviewDto>>> GetCandidatesForInterviewToday() {
            var todayStartUtc = DateTime.UtcNow.Date;
            var todayEndUtc = todayStartUtc.AddDays(1);
            var candidates = await _context.Candidates
              .Where(c => c.InterviewSched.HasValue
                 && c.InterviewSched.Value >= todayStartUtc
                 && c.InterviewSched.Value < todayEndUtc)
              .Select(c => new CandidateForInterviewDto
                 {
                     Id = c.Id,
                     FirstName = c.FirstName,
                     LastName = c.LastName,
                     InterviewSched = c.InterviewSched!.Value
                     // map remaining DTO fields here
                 })
                 .ToListAsync();
                    
             return Ok(candidates);

            }
    }
}
