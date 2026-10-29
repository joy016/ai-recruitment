import type { SvgIconComponent } from "@mui/icons-material";
import {
  AutoAwesomeOutlined,
  EditCalendarOutlined,
  EventAvailableOutlined,
  InfoOutlined,
  NotificationsNoneOutlined,
  PersonAddAlt1Outlined,
  SwapHorizOutlined,
  VideocamOutlined,
  WorkOutlineOutlined,
} from "@mui/icons-material";
import type {
  NotificationCategory,
  NotificationItem,
  NotificationType,
} from "@/lib/types/notification";

export interface NotificationIconConfig {
  label: string;
  icon: SvgIconComponent;
  /** Icon colour; ≥ 3:1 against `bg` (WCAG non-text contrast). */
  color: string;
  /** Soft circle tint behind the icon. */
  bg: string;
}

/**
 * Single source of truth for notification icons, keyed by the `category` the
 * API returns (the same keys as the Settings > Notifications toggles).
 * `satisfies` makes adding a backend category without an icon a type error.
 */
export const NOTIFICATION_ICON_CONFIG = {
  NewApplicant: {
    label: "New Applicant",
    icon: PersonAddAlt1Outlined,
    color: "#1c8758", // green
    bg: "#e8f7ef",
  },
  InterviewScheduled: {
    label: "Interview Scheduled",
    icon: EventAvailableOutlined,
    color: "#1f6fb2", // blue
    bg: "#e8f1fb",
  },
  InterviewRescheduled: {
    label: "Interview Rescheduled",
    icon: EditCalendarOutlined,
    color: "#a35f00", // amber
    bg: "#fff3e3",
  },
  CandidateStatusChanged: {
    label: "Candidate Status Changed",
    icon: SwapHorizOutlined,
    color: "#4338ca", // indigo
    bg: "#eef0ff",
  },
  JobPostUpdates: {
    label: "Job Post Updates",
    icon: WorkOutlineOutlined,
    color: "#0f766e", // teal
    bg: "#e6f6f4",
  },
  System: {
    label: "System Notifications",
    icon: InfoOutlined,
    color: "#475569", // slate
    bg: "#eef2f6",
  },
  AiScreening: {
    label: "AI Screening",
    icon: AutoAwesomeOutlined,
    color: "#6d28d9", // violet
    bg: "#f3eeff",
  },
  InterviewUpdates: {
    label: "Interview Updates",
    icon: VideocamOutlined,
    color: "#0369a1", // sky
    bg: "#e0f2fe",
  },
} as const satisfies Record<NotificationCategory, NotificationIconConfig>;

/** Notification kinds that have an icon; derived from the config keys. */
export type NotificationIconType = keyof typeof NOTIFICATION_ICON_CONFIG;

/** Neutral bell for unknown/missing types, so the list never breaks. */
export const FALLBACK_NOTIFICATION_ICON: NotificationIconConfig = {
  label: "Notification",
  icon: NotificationsNoneOutlined,
  color: "#5f7f96",
  bg: "#eef4f8",
};

/**
 * Result shown on top of the base icon: AI Screening gets a corner badge,
 * Candidate Status Changed gets a green (passed) / red (failed) tint.
 */
export type NotificationOutcome = "passed" | "needs_review" | "failed";

export const NOTIFICATION_OUTCOME_COLORS: Record<
  NotificationOutcome,
  { color: string; bg: string }
> = {
  passed: { color: "#1c8758", bg: "#e8f7ef" },
  needs_review: { color: "#a35f00", bg: "#fff3e3" },
  failed: { color: "#c62828", bg: "#fdecec" },
};

export const isNotificationIconType = (
  value: unknown,
): value is NotificationIconType =>
  typeof value === "string" && Object.hasOwn(NOTIFICATION_ICON_CONFIG, value);

const AI_SCREENING_OUTCOMES: Partial<Record<NotificationType, NotificationOutcome>> = {
  AiScreeningPassed: "passed",
  AiScreeningNeedsReview: "needs_review",
  AiScreeningFailed: "failed",
};

// TEMPORARY: the API has no status field for status changes yet, so the
// outcome is read from the text. Replace with a `status` field when added.
const REJECTED_PATTERN = /\brejected\b/i;
const PASSED_PATTERN = /\b(passed|hired)\b/i;

/** Maps an API notification to <NotificationIcon> props. */
export const getNotificationIconProps = (
  item: Pick<NotificationItem, "category" | "type" | "title" | "message">,
): { type: string | null; status: NotificationOutcome | null } => {
  if (item.category === "AiScreening") {
    return { type: item.category, status: AI_SCREENING_OUTCOMES[item.type] ?? null };
  }

  if (item.category === "CandidateStatusChanged") {
    const text = `${item.title ?? ""} ${item.message ?? ""}`;
    let status: NotificationOutcome | null = null;
    if (REJECTED_PATTERN.test(text)) status = "failed";
    else if (PASSED_PATTERN.test(text)) status = "passed";
    return { type: item.category, status };
  }

  return { type: item.category ?? null, status: null };
};
