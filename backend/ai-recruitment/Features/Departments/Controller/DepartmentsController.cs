using ai_recruitment.Data;
using ai_recruitment.Features.Departments.Dto;
using ai_recruitment.Features.Departments.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Departments.Controller
{

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]

    public class DepartmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DepartmentsController(AppDbContext context) { 
           _context = context;
        }

       
        [HttpGet("getAllDepartment")]
        public async Task<ActionResult<IEnumerable<DepartmentDto>>> GetAllDepartments()
        {
            var departments = await _context.Departments
                .AsNoTracking()
                .Select(d => new DepartmentDto
                {
                    Id = d.Id,
                    DepartmentName = d.DepartmentName
                })
                .ToListAsync();

            return Ok(departments);
        }

    }
}
