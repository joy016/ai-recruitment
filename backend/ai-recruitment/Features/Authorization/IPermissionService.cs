namespace ai_recruitment.Features.Authorization
{
    public interface IPermissionService
    {
        Task<IReadOnlySet<string>> GetPermissionsForRoleAsync(string roleName);

        void InvalidateRoleCache(string roleName);
    }
}
