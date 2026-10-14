using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Roles.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Runtime.InteropServices;

namespace ai_recruitment.Features.Roles.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RolesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IRolePermissionService _rolePermissionService;

        public RolesController(AppDbContext context, IRolePermissionService rolePermissionService)
        {
            _context = context;
            _rolePermissionService = rolePermissionService;
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
                    PermissionCount = r.Permissions.Count(),
                    ChipColor = r.ChipColor,
                    BackgroundColor = r.BackgroundColor,
                    
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
                    PermissionCount = r.Permissions.Count(),
                    
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

        [HttpGet("getInterviewer")]
        public async Task<IActionResult> GetInterviewer()
        {
            var roleIds = new[] { 4, 5 };
            var interviewer = await _context.Users
                .Where(i => roleIds.Contains(i.RoleId) && i.IsActive)
                .Select(u => new InterviewerDto {InterviewerId = u.Id, InterviewerName = u.FirstName + " " + u.LastName})
                .ToListAsync();
            return Ok(interviewer);
        }

        // Backs the Role Permissions Matrix UI: read the permissions currently
        // assigned to a role.
        [HttpGet("{roleId:int}/permissions")]
        [HasPermission(PermissionNames.Accounts.View)]
        public async Task<IActionResult> GetRolePermissions(int roleId)
        {
            var result = await _rolePermissionService.GetRolePermissionsAsync(roleId);
            if (result == null)
            {
                return NotFound(new { message = "Role not found." });
            }

            return Ok(result);
        }

        // Saves the entire permission matrix for a role in one call. The submitted list is
        // the complete desired permission set, not a delta - permissions left out are removed.
        [HttpPut("{roleId:int}/permissions")]
        [HasPermission(PermissionNames.Accounts.Manage)]
        public async Task<IActionResult> SetRolePermissions(int roleId, [FromBody] UpdateRolePermissionsDto dto)
        {
            var result = await _rolePermissionService.SetRolePermissionsAsync(roleId, dto.Permissions);
            return MapOutcome(result);
        }

        // Toggles a single permission on, e.g. flipping one checkbox in the matrix
        // without resubmitting the whole set. Idempotent: assigning an
        // already-assigned permission still succeeds.
        [HttpPost("{roleId:int}/permissions/{permissionName}")]
        [HasPermission(PermissionNames.Accounts.Manage)]
        public async Task<IActionResult> AssignRolePermission(int roleId, string permissionName)
        {
            var result = await _rolePermissionService.AssignPermissionAsync(roleId, permissionName);
            return MapOutcome(result);
        }

        // Toggles a single permission off for one role only.
        [HttpDelete("{roleId:int}/permissions/{permissionName}")]
        [HasPermission(PermissionNames.Accounts.Manage)]
        public async Task<IActionResult> RemoveRolePermission(int roleId, string permissionName)
        {
            var result = await _rolePermissionService.RemovePermissionAsync(roleId, permissionName);
            return MapOutcome(result);
        }

        private IActionResult MapOutcome(RolePermissionOperationResult result)
        {
            return result.Outcome switch
            {
                RolePermissionOutcome.Success => Ok(result.Data),
                RolePermissionOutcome.RoleNotFound => NotFound(new { message = result.Message }),
                RolePermissionOutcome.AssignmentNotFound => NotFound(new { message = result.Message }),
                RolePermissionOutcome.InvalidPermissionNames => BadRequest(new
                {
                    message = result.Message,
                    invalidPermissions = result.InvalidPermissions
                }),
                RolePermissionOutcome.WouldRemoveLastAdministrativeAccess => Conflict(new { message = result.Message }),
                _ => StatusCode(500, new { message = "Unexpected error." })
            };
        }
    }
}
