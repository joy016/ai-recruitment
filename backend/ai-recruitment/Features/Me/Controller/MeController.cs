using System.Security.Claims;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Me.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ai_recruitment.Features.Me.Controller
{
    // Backs the read-only "Access & Permissions" screen: any authenticated user can see their
    // own role and permissions. Role/permission management itself lives under Accounts
    // (RolesController/PermissionsController) and is gated by accounts.manage.
    [ApiController]
    [Route("api/me")]
    [Authorize]
    public class MeController : ControllerBase
    {
        private readonly IPermissionService _permissionService;

        public MeController(IPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        [HttpGet("permissions")]
        public async Task<IActionResult> GetMyPermissions()
        {
            var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
            if (string.IsNullOrWhiteSpace(roleName))
            {
                return Unauthorized();
            }

            var permissions = await _permissionService.GetPermissionsForRoleAsync(roleName);

            return Ok(new MyPermissionsDto
            {
                Role = roleName,
                Permissions = permissions.OrderBy(p => p).ToList(),
            });
        }
    }
}
