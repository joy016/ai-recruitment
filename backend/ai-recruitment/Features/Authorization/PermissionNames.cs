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

        public static readonly IReadOnlyList<string> All = new[]
        {
            Candidates.View, Candidates.Create, Candidates.Edit, Candidates.Delete,
            JobPosts.View, JobPosts.Create, JobPosts.Edit, JobPosts.Delete,
            Interviews.View, Interviews.Schedule, Interviews.Reschedule,
            Accounts.View, Accounts.Manage,
            Settings.View, Settings.ManageSystemSettings
        };
    }
}
