using ai_recruitment.Data;
using ai_recruitment.Features.Roles.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Roles.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RolesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("insertRole")]
        public async Task<IActionResult> InsertRole([FromBody] CreateRoleDto dto)
        {
            var existingRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == dto.RoleName);

            if (existingRole != null)
            {
                return Conflict(new
                {
                    message = "A role with this name already exists."
                });
            }

            var role = new Model.Role
            {
                RoleName = dto.RoleName,
                Description = dto.Description,
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetRole),
                new { id = role.RoleId },
                role
            );
        }

        [HttpGet("getAllRoles")]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _context.Roles.AsNoTracking()
                .OrderBy(r => r.RoleName)
                .Select(r => new RoleDto
                {
                    RoleId = r.RoleId,
                    RoleName = r.RoleName,
                    Description = r.Description,
                    IsActive = r.IsActive,
                    CreatedAt = r.CreatedAt,
                    UserCount = r.Users.Count(),
                    PermissionCount = r.Permissions.Count()
                })
                .ToListAsync();

            return Ok(roles);
        }

        [HttpGet("getRole/{id:int}")]
        public async Task<IActionResult> GetRole(int id)
        {
            var role = await _context.Roles.AsNoTracking()
                .Where(r => r.RoleId == id)
                .Select(r => new RoleDto
                {
                    RoleId = r.RoleId,
                    RoleName = r.RoleName,
                    Description = r.Description,
                    IsActive = r.IsActive,
                    CreatedAt = r.CreatedAt,
                    UserCount = r.Users.Count(),
                    PermissionCount = r.Permissions.Count()
                })
                .FirstOrDefaultAsync();

            if (role == null)
            {
                return NotFound(new
                {
                    message = "Role not found."
                });
            }

            return Ok(role);
        }

        [HttpPut("editRole/{roleId:int}")]
        public async Task<IActionResult> EditRole(int roleId, [FromBody] CreateRoleDto dto)
        {
            var role = await _context.Roles.FindAsync(roleId);

            if (role == null)
            {
                return NotFound(new
                {
                    message = "Role not found."
                });
            }

            role.RoleName = dto.RoleName;
            role.Description = dto.Description;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Role updated successfully."
            });
        }

        [HttpPut("updateRoleStatus/{roleId:int}")]
        public async Task<IActionResult> UpdateRoleStatus(int roleId, [FromBody] bool isActive)
        {
            var affectedRows = await _context.Roles
                .Where(r => r.RoleId == roleId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(r => r.IsActive, isActive));

            if (affectedRows == 0)
            {
                return NotFound(new
                {
                    message = "Role not found."
                });
            }

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Role status updated successfully."
            });
        }
    }
}
