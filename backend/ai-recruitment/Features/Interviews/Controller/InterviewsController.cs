using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Interviews.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ai_recruitment.Features.Interviews.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InterviewsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InterviewsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("schedule")]
        [HasPermission(PermissionNames.Interviews.Schedule)]
        public async Task<IActionResult> ScheduleInterview([FromBody] ScheduleInterviewDto dto)
        {
            var candidate = await _context.Candidates.FindAsync(dto.CandidateId);
            if (candidate == null)
            {
                return NotFound(new { message = "Candidate not found." });
            }

            candidate.InterviewSched = dto.InterviewDateTime;
            candidate.InterviewerId = dto.InterviewerId;
            candidate.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Interview scheduled successfully.",
            });
        }

        [HttpPut("reschedule/{candidateId:guid}")]
        [HasPermission(PermissionNames.Interviews.Reschedule)]
        public async Task<IActionResult> RescheduleInterview(Guid candidateId, [FromBody] RescheduleInterviewDto dto)
        {
            var candidate = await _context.Candidates.FindAsync(candidateId);
            if (candidate == null)
            {
                return NotFound(new { message = "Candidate not found." });
            }

            if (candidate.InterviewSched == null)
            {
                return BadRequest(new { message = "Candidate does not have an interview scheduled yet." });
            }

            candidate.InterviewSched = dto.NewInterviewDateTime;
            candidate.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Interview rescheduled successfully.",
            });
        }
    }
}
