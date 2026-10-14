using Microsoft.AspNetCore.Authorization;

namespace ai_recruitment.Features.Authorization
{
    // Usage: [HasPermission(PermissionNames.Candidates.Delete)]
    // Resolves to the "Permission:<name>" policy handled by PermissionPolicyProvider/PermissionHandler.
    // Controllers should never use [Authorize(Roles = "...")] - permissions, not role names, are
    // what gate access, so a role's access can change by editing its RolePermission rows instead
    // of redeploying code.
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
    public class HasPermissionAttribute : AuthorizeAttribute
    {
        public HasPermissionAttribute(string permission) : base(PermissionPolicyProvider.PolicyPrefix + permission)
        {
        }
    }
}
