namespace ai_recruitment.Features.Authorization
{
    // Named "PermissionNames" (not "Permissions") to avoid colliding with the sibling
    // ai_recruitment.Features.Permissions namespace (Permission entity/controller/dtos).
    public static class PermissionNames
    {
        public static class Candidates
        {
            public const string View = "candidates.view";
            public const string Create = "candidates.create";
            public const string Edit = "candidates.edit";
            public const string Delete = "candidates.delete";
        }

        public static class JobPosts
        {
            public const string View = "jobposts.view";
            public const string Create = "jobposts.create";
            public const string Edit = "jobposts.edit";
            public const string Delete = "jobposts.delete";
        }

        public static class Interviews
        {
            public const string View = "interviews.view";
            public const string Schedule = "interviews.schedule";
            public const string Reschedule = "interviews.reschedule";
        }

        public static class Accounts
        {
            public const string View = "accounts.view";
            public const string Manage = "accounts.manage";
        }

        public static class Settings
        {
            public const string View = "settings.view";
            public const string ManageSystemSettings = "settings.manageSystemSettings";
        }

        // HR Inbox (plain email feature - never grants any Candidate write access).
        // Deliberately NOT included in `All`/`RolePermissionMap` in PermissionSeedData -
        // see PermissionSeedData.InboxPermissionRoleMap for why (keeps every pre-existing
        // seeded Permission row's id stable across this migration).
        public static class Inbox
        {
            public const string View = "inbox.view";
            public const string Send = "inbox.send";
            public const string ManageTemplates = "inbox.manageTemplates";
        }

        public static readonly IReadOnlyList<string> All = new[]
        {
            Candidates.View, Candidates.Create, Candidates.Edit, Candidates.Delete,
            JobPosts.View, JobPosts.Create, JobPosts.Edit, JobPosts.Delete,
            Interviews.View, Interviews.Schedule, Interviews.Reschedule,
            Accounts.View, Accounts.Manage,
            Settings.View, Settings.ManageSystemSettings
        };

        // The full catalog including Inbox permissions - used wherever code needs to validate
        // or list every assignable permission (e.g. RolePermissionService). Kept separate from
        // `All` so PermissionSeedData's Super Admin role mapping (which uses `All`) doesn't
        // shift every subsequent role's seeded PermissionId - see PermissionSeedData.
        public static readonly IReadOnlyList<string> Catalog = new List<string>(All)
        {
            Inbox.View, Inbox.Send, Inbox.ManageTemplates
        };
    }
}
