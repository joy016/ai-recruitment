using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Interviews.Dto;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
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
        private readonly INotificationService _notificationService;

        public InterviewsController(AppDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
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

            var previousSchedule = candidate.InterviewSched;
            var previousInterviewerId = candidate.InterviewerId;

            candidate.InterviewSched = dto.InterviewDateTime;
            candidate.InterviewerId = dto.InterviewerId;
            candidate.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (previousSchedule != candidate.InterviewSched || previousInterviewerId != candidate.InterviewerId)
            {
                await _notificationService.NotifyAsync(
                    NotificationType.InterviewScheduled,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Info,
                        Title = "Interview Scheduled",
                        Message = $"{candidate.FirstName} {candidate.LastName}'s interview for {candidate.Role} was scheduled for {candidate.InterviewSched:yyyy-MM-dd HH:mm} UTC.",
                        CandidateId = candidate.Id,
                        JobId = candidate.JobId,
                    },
                    $"interview-scheduled:{candidate.Id}:{candidate.InterviewSched:O}",
                    HttpContext.RequestAborted);
            }

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

            var previousSchedule = candidate.InterviewSched;

            candidate.InterviewSched = dto.NewInterviewDateTime;
            candidate.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (previousSchedule != candidate.InterviewSched)
            {
                await _notificationService.NotifyAsync(
                    NotificationType.InterviewRescheduled,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Warning,
                        Title = "Interview Rescheduled",
                        Message = $"{candidate.FirstName} {candidate.LastName}'s interview for {candidate.Role} was moved to {candidate.InterviewSched:yyyy-MM-dd HH:mm} UTC.",
                        CandidateId = candidate.Id,
                        JobId = candidate.JobId,
                    },
                    $"interview-rescheduled:{candidate.Id}:{candidate.InterviewSched:O}",
                    HttpContext.RequestAborted);
            }

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Interview rescheduled successfully.",
            });
        }
    }
}
