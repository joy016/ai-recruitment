using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.JobPosts.Dto;
using ai_recruitment.Features.JobPosts.Model;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;


namespace ai_recruitment.Features.JobPosts.Controller
{


    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JobController : ControllerBase

    {

        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;


        public JobController(AppDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpPost("insertJob")]
        [HasPermission(PermissionNames.JobPosts.Create)]
        public async Task<IActionResult> InsertJob([FromBody] Dto.InsertJobDto jobDto)
        {

            // Model validation via data annotations; [ApiController] will auto-validate,
            // but explicitly returning ModelState here keeps behavior clear.
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var createdJob = new Model.Job
            {
                JobTitle = jobDto.JobTitle,
                Location = jobDto.Location,
                JobType = jobDto.JobType,
                JobStatus = jobDto.JobStatus,
                Department = jobDto.Department,
                JobDescription = jobDto.JobDescription,
                Qualifications = jobDto.Qualifications,
                TechSkills = jobDto.TechSkills,
            };

            _context.Jobs.Add(createdJob);

            await _context.SaveChangesAsync();

            await _notificationService.NotifyAsync(
                NotificationType.JobPostUpdated,
                new NotificationContext
                {
                    Severity = NotificationSeverity.Info,
                    Title = "Job Post Updates",
                    Message = $"A new job post, {createdJob.JobTitle}, was created.",
                    JobId = createdJob.JobId,
                },
                $"jobpost-created:{createdJob.JobId}",
                HttpContext.RequestAborted);

            return Ok(new
            {
                StatusCode = 200,
                Message = "Job inserted successfully",

            });
        }

        [HttpGet("getAllJob")]
        [HasPermission(PermissionNames.JobPosts.View)]
        public async Task<IActionResult> GetAllJobs([FromQuery] string jobStatus, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {


            var query = _context.Jobs.AsQueryable();

            if (jobStatus != "All")
            {
                query = query.Where(j => j.JobStatus == jobStatus);
            }
            var totalCount = await query.CountAsync();

            var jobs = await query
                .OrderByDescending(j => j.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(j => new GetAllJobDto
                {
                    JobId = j.JobId,
                    JobTitle = j.JobTitle,
                    JobStatus = j.JobStatus,
                    CreatedAt = j.CreatedAt,
                    Department = j.Department,
                    ApplicantCount = j.Candidates.Count(),

                })
                .ToListAsync();



            return Ok(new
            {
                data = jobs,
                pageNumber,
                pageSize,
                totalPage = (int)Math.Ceiling((double)totalCount / pageSize),
                totalCount,
            });
        }


        [HttpGet("getJob/{id:int}")]
        [HasPermission(PermissionNames.JobPosts.View)]
        public async Task<IActionResult> GetJobById(int id)
        {
            var job = await _context.Jobs.FindAsync(id);



            if (job == null)
            {
                return NotFound();
            }

            var jobDto = new JobListDto
            {
                JobId = job.JobId,
                JobTitle = job.JobTitle,
                Department = job.Department,
                JobStatus = job.JobStatus,
                JobType = job.JobType,
                JobDescription = job.JobDescription,
                Qualifications = job.Qualifications,
                TechSkills = job.TechSkills,
                Location = job.Location,
                CreatedAt = job.CreatedAt
            };

            return Ok(jobDto);
        }

        [HttpPut("updateJobStatus/{jobId:int}")]
        [HasPermission(PermissionNames.JobPosts.Edit)]
        public async Task<IActionResult> UpdateJobStatus(
            int jobId,
            [FromBody] string jobStatus)
        {
            var existingJob = await _context.Jobs
                .AsNoTracking()
                .Where(j => j.JobId == jobId)
                .Select(j => new { j.JobTitle, j.JobStatus })
                .FirstOrDefaultAsync();

            if (existingJob == null)
            {
                return NotFound(new
                {
                    StatusCode = 404,
                    Message = "Job not found"
                });
            }

            await _context.Jobs
                .Where(j => j.JobId == jobId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(j => j.JobStatus, jobStatus));

            if (existingJob.JobStatus != jobStatus)
            {
                await _notificationService.NotifyAsync(
                    NotificationType.JobPostUpdated,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Info,
                        Title = "Job Post Updates",
                        Message = $"{existingJob.JobTitle} status changed to {jobStatus}.",
                        JobId = jobId,
                    },
                    $"jobpost-status:{jobId}:{ComputeContentHash(jobStatus)}",
                    HttpContext.RequestAborted);
            }

            return Ok(new
            {
                StatusCode = 200,
                Message = "Updated Successfully"
            });
        }

        [HttpPut("editJob/{jobId:int}")]
        [HasPermission(PermissionNames.JobPosts.Edit)]
        public async Task<IActionResult> EditJob(int jobId, [FromBody] InsertJobDto jobDto)
        {
            var job = await _context.Jobs.FindAsync(jobId);

            if (job == null)
            {
                return NotFound(new
                {
                    StatusCode = 404,
                    Message = "Job not found"
                });
            }

            var hasChanges = job.JobTitle != jobDto.JobTitle
                || job.Location != jobDto.Location
                || job.JobType != jobDto.JobType
                || job.JobStatus != jobDto.JobStatus
                || job.JobDescription != jobDto.JobDescription
                || job.Department != jobDto.Department
                || !job.Qualifications.SequenceEqual(jobDto.Qualifications)
                || !job.TechSkills.SequenceEqual(jobDto.TechSkills);

            // Update the job properties
            job.JobTitle = jobDto.JobTitle;
            job.Location = jobDto.Location;
            job.JobType = jobDto.JobType;
            job.JobStatus = jobDto.JobStatus;
            job.JobDescription = jobDto.JobDescription;
            job.Qualifications = jobDto.Qualifications;
            job.TechSkills = jobDto.TechSkills;
            job.Department = jobDto.Department;

            _context.Jobs.Update(job);
            await _context.SaveChangesAsync();

            if (hasChanges)
            {
                var contentKey = ComputeContentHash(string.Join('|',
                    job.JobTitle, job.Location, job.JobType, job.JobStatus, job.JobDescription, job.Department,
                    string.Join(',', job.Qualifications), string.Join(',', job.TechSkills)));

                await _notificationService.NotifyAsync(
                    NotificationType.JobPostUpdated,
                    new NotificationContext
                    {
                        Severity = NotificationSeverity.Info,
                        Title = "Job Post Updates",
                        Message = $"{job.JobTitle} was updated.",
                        JobId = job.JobId,
                    },
                    $"jobpost-edited:{job.JobId}:{contentKey}",
                    HttpContext.RequestAborted);
            }

            return Ok(new
            {
                StatusCode = 200,
                Message = "Job updated successfully"
            });
        }

        // Deterministic (unlike string.GetHashCode, which varies per process) so the same
        // edit content always produces the same dedup key.
        private static string ComputeContentHash(string content)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
            return Convert.ToHexString(bytes)[..16];
        }

        [HttpDelete("{jobId:int}")]
        [HasPermission(PermissionNames.JobPosts.Delete)]
        public async Task<IActionResult> DeleteJob(int jobId)
        {
            var job = await _context.Jobs.FindAsync(jobId);

            if (job == null)
            {
                return NotFound(new
                {
                    StatusCode = 404,
                    Message = "Job not found"
                });
            }

            _context.Jobs.Remove(job);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}
