using ai_recruitment.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ai_recruitment.Features.ApplicationStatuses
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
    }
}
