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

        // Added when the HR Inbox module shipped. Kept out of RolePermissionMap/`All` and
        // appended in a second pass (see Build()) specifically so every pre-existing
        // Permission row above keeps the exact same PermissionId - inserting these into
        // RolePermissionMap's dictionary order instead would shift every later role's
        // sequential id and generate a migration that overwrites already-applied seed rows.
        private static readonly DateTime InboxSeededAt = new(2026, 10, 30, 0, 0, 0, DateTimeKind.Utc);

        private static readonly IReadOnlyDictionary<int, string[]> InboxPermissionRoleMap = new Dictionary<int, string[]>
        {
            // Super Admin
            [1] = new[]
            {
                Authorization.PermissionNames.Inbox.View,
                Authorization.PermissionNames.Inbox.Send,
                Authorization.PermissionNames.Inbox.ManageTemplates,
            },

            // HR Admin - can view/send mail but not manage the template catalog
            [2] = new[]
            {
                Authorization.PermissionNames.Inbox.View,
                Authorization.PermissionNames.Inbox.Send,
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

            foreach (var (roleId, permissionNames) in InboxPermissionRoleMap)
            {
                foreach (var permissionName in permissionNames)
                {
                    seed.Add(new Permission
                    {
                        PermissionId = nextId++,
                        PermissionName = permissionName,
                        RoleId = roleId,
                        CreatedAt = InboxSeededAt,
                    });
                }
            }

            return seed;
        }
    }
}
