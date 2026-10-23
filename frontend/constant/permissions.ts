/**
 * Permission names, mirroring the backend's PermissionNames
 * (Features/Authorization/PermissionNames.cs). Checks always use these names,
 * never role names or ids; which roles hold them comes from the API.
 */
export const PERMISSIONS = {
  candidates: {
    view: "candidates.view",
    create: "candidates.create",
    edit: "candidates.edit",
    delete: "candidates.delete",
  },
  jobPosts: {
    view: "jobposts.view",
    create: "jobposts.create",
    edit: "jobposts.edit",
    delete: "jobposts.delete",
  },
  interviews: {
    view: "interviews.view",
    schedule: "interviews.schedule",
    reschedule: "interviews.reschedule",
  },
  accounts: {
    view: "accounts.view",
    manage: "accounts.manage",
  },
  settings: {
    view: "settings.view",
    manageSystemSettings: "settings.manageSystemSettings",
  },
} as const;

/** The dashboard is shown to anyone who can see at least one of its widgets. */
export const DASHBOARD_PERMISSIONS = [
  PERMISSIONS.jobPosts.view,
  PERMISSIONS.candidates.view,
  PERMISSIONS.interviews.view,
];
