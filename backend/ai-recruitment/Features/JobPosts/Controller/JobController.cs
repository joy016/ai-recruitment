using ai_recruitment.Data;
using ai_recruitment.Features.JobPosts.Dto;
using ai_recruitment.Features.JobPosts.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;


namespace ai_recruitment.Features.JobPosts.Controller
{


    [ApiController]
    [Route("api/[controller]")]
    public class JobController : ControllerBase

    {

        private readonly AppDbContext _context;


        public JobController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("insertJob")]
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

            return Ok(new
            {
                StatusCode = 200,
                Message = "Job inserted successfully",

            });
        }

        [HttpGet("getAllJob")]
        public async Task<IActionResult> GetAllJobs([FromQuery] string jobStatus, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
           

            var query = _context.Jobs.AsQueryable();

            if(jobStatus != "All")
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
        public async Task<IActionResult> UpdateJobStatus(
            int jobId,
            [FromBody] string jobStatus)
        {
            var affectedRows = await _context.Jobs
                .Where(j => j.JobId == jobId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(j => j.JobStatus, jobStatus));

            if (affectedRows == 0)
            {
                return NotFound(new
                {
                    StatusCode = 404,
                    Message = "Job not found"
                });
            }

            return Ok(new
            {
                StatusCode = 200,
                Message = "Updated Successfully"
            });
        }

        [HttpPut("editJob/{jobId:int}")]
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

            return Ok(new
            {
                StatusCode = 200,
                Message = "Job updated successfully"
            });
        }

    }
}
