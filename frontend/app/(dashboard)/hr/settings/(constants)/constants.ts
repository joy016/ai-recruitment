import {
  NotificationSetting,
  PermissionGroupData,
  ThemePreference,
  UserPreferences,
  UserProfile,
} from "../(types)/settings.types";

/**
 * Mock/local data for the Settings UI. Swap these for real API responses
 * (GET /profile, GET /notification-settings, GET /permissions, ...) without
 * touching the components — they only consume props/state shaped like this.
 */
export const MOCK_USER_PROFILE: UserProfile = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@company.com",
  phoneNumber: "+63 912 345 6789",
  jobTitle: "HR Administrator",
  department: "Human Resources",
  employeeId: "EMP-00124",
  role: "HR Admin",
  accountStatus: "Active",
  dateJoined: "2025-01-15T00:00:00.000Z",
};

export const DEPARTMENT_OPTIONS = [
  "Human Resources",
  "IT",
  "Finance",
  "Operations",
];

export const MOCK_NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: "newApplicant",
    title: "New Applicant",
    description: "Receive a notification when a new candidate applies.",
    enabled: true,
  },
  {
    key: "interviewScheduled",
    title: "Interview Scheduled",
    description: "Receive notifications when an interview is scheduled.",
    enabled: true,
  },
  {
    key: "interviewRescheduled",
    title: "Interview Rescheduled",
    description: "Receive notifications when an interview is changed.",
    enabled: true,
  },
  {
    key: "candidateStatusChanged",
    title: "Candidate Status Changed",
    description:
      "Receive notifications when a candidate moves to another recruitment stage.",
    enabled: true,
  },
  {
    key: "jobPostUpdates",
    title: "Job Post Updates",
    description: "Receive notifications about job post changes.",
    enabled: false,
  },
  {
    key: "systemNotifications",
    title: "System Notifications",
    description: "Receive important system notifications.",
    enabled: true,
  },
];

export const MOCK_PREFERENCES: UserPreferences = {
  language: "English",
  timezone: "Asia/Manila",
  dateFormat: "MM/DD/YYYY",
  theme: "Light",
};

export const LANGUAGE_OPTIONS = ["English"];

export const TIMEZONE_OPTIONS = [
  "Asia/Manila",
  "UTC",
  "America/New_York",
  "Europe/London",
];

export const DATE_FORMAT_OPTIONS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

export const THEME_OPTIONS: ThemePreference[] = ["Light", "Dark", "System"];

export const MOCK_PERMISSION_GROUPS: PermissionGroupData[] = [
  {
    category: "Candidates",
    permissions: [
      { label: "View Candidates", granted: true },
      { label: "Create Candidates", granted: true },
      { label: "Edit Candidates", granted: true },
      { label: "Delete Candidates", granted: true },
    ],
  },
  {
    category: "Job Posts",
    permissions: [
      { label: "View Job Posts", granted: true },
      { label: "Create Job Posts", granted: true },
      { label: "Edit Job Posts", granted: true },
      { label: "Delete Job Posts", granted: false },
    ],
  },
  {
    category: "Interviews",
    permissions: [
      { label: "View Interviews", granted: true },
      { label: "Schedule Interviews", granted: true },
      { label: "Reschedule Interviews", granted: true },
    ],
  },
  {
    category: "Accounts",
    permissions: [
      { label: "View Accounts", granted: false },
      { label: "Manage Accounts", granted: false },
    ],
  },
  {
    category: "Settings",
    permissions: [
      { label: "View Settings", granted: true },
      { label: "Manage System Settings", granted: false },
    ],
  },
];

export const MOCK_LAST_LOGIN = "2026-09-23T17:42:00.000Z";

const lastLoginDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const lastLoginTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Formats an ISO date string as "September 23, 2026 at 5:42 PM". Falls back
 * to the raw value if it can't be parsed.
 */
export const formatLastLogin = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return `${lastLoginDateFormatter.format(parsedDate)} at ${lastLoginTimeFormatter.format(parsedDate)}`;
};
