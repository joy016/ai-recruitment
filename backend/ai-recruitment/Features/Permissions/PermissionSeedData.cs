using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Permissions.Model;

namespace ai_recruitment.Features.Permissions
{
    // Role -> permission matrix backing the seeded RolePermission rows (the existing
    // Permission table already is that mapping: one row per (RoleId, PermissionName) pair).
    // Role ids match the ones seeded for Role in AppDbContext.
    public static class PermissionSeedData
    {
        private static readonly DateTime SeededAt = new(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc);

        private static readonly IReadOnlyDictionary<int, string[]> RolePermissionMap = new Dictionary<int, string[]>
        {
            // Super Admin - all permissions
            [1] = Authorization.PermissionNames.All.ToArray(),

            // HR Admin - all Candidates; Job Posts view/create/edit (no delete);
            // all Interviews; view Settings only; no Accounts
            [2] = new[]
            {
                Authorization.PermissionNames.Candidates.View,
                Authorization.PermissionNames.Candidates.Create,
                Authorization.PermissionNames.Candidates.Edit,
                Authorization.PermissionNames.Candidates.Delete,
                Authorization.PermissionNames.JobPosts.View,
                Authorization.PermissionNames.JobPosts.Create,
                Authorization.PermissionNames.JobPosts.Edit,
                Authorization.PermissionNames.Interviews.View,
                Authorization.PermissionNames.Interviews.Schedule,
                Authorization.PermissionNames.Interviews.Reschedule,
                Authorization.PermissionNames.Settings.View,
            },

            // Recruiter - candidates view/create/edit; job posts view;
            // interviews view/schedule/reschedule
            [3] = new[]
            {
                Authorization.PermissionNames.Candidates.View,
                Authorization.PermissionNames.Candidates.Create,
                Authorization.PermissionNames.Candidates.Edit,
                Authorization.PermissionNames.JobPosts.View,
                Authorization.PermissionNames.Interviews.View,
                Authorization.PermissionNames.Interviews.Schedule,
                Authorization.PermissionNames.Interviews.Reschedule,
            },

            // Hiring Manager - candidates view; job posts view/create/edit; interviews view
            [4] = new[]
            {
                Authorization.PermissionNames.Candidates.View,
                Authorization.PermissionNames.JobPosts.View,
                Authorization.PermissionNames.JobPosts.Create,
                Authorization.PermissionNames.JobPosts.Edit,
                Authorization.PermissionNames.Interviews.View,
            },

            // Interviewer - candidates view; interviews view
            [5] = new[]
            {
                Authorization.PermissionNames.Candidates.View,
                Authorization.PermissionNames.Interviews.View,
            },
        };

        public static IReadOnlyList<Permission> Build()
        {
            var seed = new List<Permission>();
            var nextId = 1;

            foreach (var (roleId, permissionNames) in RolePermissionMap)
            {
                foreach (var permissionName in permissionNames)
                {
                    seed.Add(new Permission
                    {
                        PermissionId = nextId++,
                        PermissionName = permissionName,
                        RoleId = roleId,
                        CreatedAt = SeededAt,
                    });
                }
            }

            return seed;
        }
    }
}
