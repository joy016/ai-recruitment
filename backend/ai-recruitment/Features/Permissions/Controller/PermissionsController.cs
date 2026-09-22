using ai_recruitment.Data;
using ai_recruitment.Features.Permissions.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Permissions.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PermissionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PermissionsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("insertPermission")]
        public async Task<IActionResult> InsertPermission([FromBody] CreatePermissionDto dto)
        {
            var roleExists = await _context.Roles.AnyAsync(r => r.RoleId == dto.RoleId);
            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "The specified role does not exist."
                });
            }

            var existingPermission = await _context.Permissions
                .FirstOrDefaultAsync(p => p.PermissionName == dto.PermissionName && p.RoleId == dto.RoleId);

            if (existingPermission != null)
            {
                return Conflict(new
                {
                    message = "This permission already exists for the specified role."
                });
            }

            var permission = new Model.Permission
            {
                PermissionName = dto.PermissionName,
                Description = dto.Description,
                RoleId = dto.RoleId,
            };

            _context.Permissions.Add(permission);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetPermission),
                new { id = permission.PermissionId },
                permission
            );
        }

        [HttpGet("getAllPermissions")]
        public async Task<IActionResult> GetAllPermissions([FromQuery] int? roleId)
        {
            var query = _context.Permissions.AsNoTracking().AsQueryable();

            if (roleId.HasValue)
            {
                query = query.Where(p => p.RoleId == roleId.Value);
            }

            var permissions = await query
                .OrderBy(p => p.PermissionName)
                .Select(p => new PermissionDto
                {
                    PermissionId = p.PermissionId,
                    PermissionName = p.PermissionName,
                    Description = p.Description,
                    CreatedAt = p.CreatedAt,
                    RoleId = p.RoleId,
                    RoleName = p.Role.RoleName
                })
                .ToListAsync();

            return Ok(permissions);
        }

        [HttpGet("getPermission/{id:int}")]
        public async Task<IActionResult> GetPermission(int id)
        {
            var permission = await _context.Permissions.AsNoTracking()
                .Where(p => p.PermissionId == id)
                .Select(p => new PermissionDto
                {
                    PermissionId = p.PermissionId,
                    PermissionName = p.PermissionName,
                    Description = p.Description,
                    CreatedAt = p.CreatedAt,
                    RoleId = p.RoleId,
                    RoleName = p.Role.RoleName
                })
                .FirstOrDefaultAsync();

            if (permission == null)
            {
                return NotFound(new
                {
                    message = "Permission not found."
                });
            }

            return Ok(permission);
        }

        [HttpPut("editPermission/{permissionId:int}")]
        public async Task<IActionResult> EditPermission(int permissionId, [FromBody] CreatePermissionDto dto)
        {
            var permission = await _context.Permissions.FindAsync(permissionId);

            if (permission == null)
            {
                return NotFound(new
                {
                    message = "Permission not found."
                });
            }

            var roleExists = await _context.Roles.AnyAsync(r => r.RoleId == dto.RoleId);
            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "The specified role does not exist."
                });
            }

            permission.PermissionName = dto.PermissionName;
            permission.Description = dto.Description;
            permission.RoleId = dto.RoleId;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "Permission updated successfully."
            });
        }
    }
}
