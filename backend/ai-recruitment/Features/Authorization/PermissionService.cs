using ai_recruitment.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ai_recruitment.Features.Authorization
{
    public class PermissionService : IPermissionService
    {
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;

        public PermissionService(AppDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IReadOnlySet<string>> GetPermissionsForRoleAsync(string roleName)
        {
            var cacheKey = BuildCacheKey(roleName);

            if (_cache.TryGetValue(cacheKey, out HashSet<string>? cached) && cached is not null)
            {
                return cached;
            }

            var permissionNames = await _context.Permissions
                .AsNoTracking()
                .Where(p => p.Role.RoleName == roleName)
                .Select(p => p.PermissionName)
                .ToListAsync();

            var permissionSet = new HashSet<string>(permissionNames, StringComparer.OrdinalIgnoreCase);

            _cache.Set(cacheKey, permissionSet, CacheDuration);

            return permissionSet;
        }

        public void InvalidateRoleCache(string roleName)
        {
            _cache.Remove(BuildCacheKey(roleName));
        }

        private static string BuildCacheKey(string roleName) =>
            $"role-permissions:{roleName.Trim().ToLowerInvariant()}";
    }
}
