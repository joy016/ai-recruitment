export type SettingsSectionKey =
  | "profile"
  | "security"
  | "notifications"
  | "preferences"
  | "permissions";

export type AccountStatus = "Active" | "Inactive";

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  department: string;
  employeeId: string;
  role: string;
  accountStatus: AccountStatus;
  dateJoined: string;
}

export interface NotificationSetting {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
}

export type ThemePreference = "Light" | "Dark" | "System";

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  theme: ThemePreference;
}

export interface PermissionItem {
  label: string;
  granted: boolean;
}

export interface PermissionGroupData {
  category: string;
  permissions: PermissionItem[];
}
