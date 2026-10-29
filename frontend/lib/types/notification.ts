export const NOTIFICATION_CATEGORIES = [
  "NewApplicant",
  "InterviewScheduled",
  "InterviewRescheduled",
  "CandidateStatusChanged",
  "JobPostUpdates",
  "System",
  "AiScreening",
  "InterviewUpdates",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_TYPES = [
  "NewApplicant",
  "InterviewScheduled",
  "InterviewRescheduled",
  "CandidateStatusChanged",
  "JobPostUpdated",
  "SystemNotice",
  "AiScreeningPassed",
  "AiScreeningNeedsReview",
  "AiScreeningFailed",
  "MeetingAccepted",
  "MeetingDeclined",
  "InterviewReminder",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationSeverity = "Success" | "Warning" | "Info";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  isRead: boolean;
  /** UTC; may arrive without a "Z" suffix — parse with parseUtcDate. */
  createdAt: string;
  candidateId: string | null;
  jobId: number | null;
  /** Always null for now. */
  interviewId: string | null;
}

/** GET /api/notifications, normalised (see lib/api/notifications.ts). */
export interface PagedNotifications {
  items: NotificationItem[];
  totalCount: number;
}

export interface GetNotificationsParams {
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
}

export interface NotificationPreference {
  // string, not NotificationCategory: categories added on the backend must
  // still render without a frontend change.
  category: string;
  label: string;
  description: string;
  isEnabled: boolean;
}

export interface NotificationPreferenceUpdate {
  category: string;
  isEnabled: boolean;
}
