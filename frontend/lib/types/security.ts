/** GET /api/Security/getSecuritySummary */
export interface SecuritySummary {
  /** The user's PREVIOUS login (not the one for the current session). Null if none recorded. */
  lastLoginAt: string | null;
  /** Null if the password has never been changed. */
  passwordChangedAt: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  otherSessionsSignedOut: number;
}

/** Field this error applies to, so the UI can show it under the matching input. */
export type ChangePasswordField =
  | "currentPassword"
  | "newPassword"
  | "confirmNewPassword";

export interface ChangePasswordFieldError {
  field: ChangePasswordField | null;
  message: string;
}

/** GET /api/Security/getActiveSessions */
export interface ActiveSession {
  sessionId: string;
  deviceLabel: string;
  browser: string | null;
  operatingSystem: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface LogoutAllSessionsResponse {
  message: string;
  sessionsSignedOut: number;
}
