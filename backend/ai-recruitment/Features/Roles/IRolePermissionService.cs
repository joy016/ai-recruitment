using ai_recruitment.Features.Roles.Dto;

namespace ai_recruitment.Features.Roles
{
    public interface IRolePermissionService
    {
        Task<RolePermissionsDto?> GetRolePermissionsAsync(int roleId);

        Task<RolePermissionOperationResult> AssignPermissionAsync(int roleId, string permissionName);

        Task<RolePermissionOperationResult> RemovePermissionAsync(int roleId, string permissionName);

        // permissionNames is the complete desired set for the role, not a delta.
        Task<RolePermissionOperationResult> SetRolePermissionsAsync(int roleId, IReadOnlyCollection<string> permissionNames);
    }
}
