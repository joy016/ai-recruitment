export interface ScreeningTone {
  /** Text/icon colour; ≥ 4.5:1 against `bg`. */
  color: string;
  /** Soft tint for chips and cards. */
  bg: string;
}

export const SCREENING_TONES = {
  success: { color: "#1c8758", bg: "#e8f7ef" },
  warning: { color: "#a35f00", bg: "#fff3e3" },
  danger: { color: "#c62828", bg: "#fdecec" },
  neutral: { color: "#5f7f96", bg: "#eef4f8" },
} as const satisfies Record<string, ScreeningTone>;

export type ScreeningToneName = keyof typeof SCREENING_TONES;

/** Badge label and tone per AI recommendation. Unknown values use NEUTRAL. */
export const RECOMMENDATION_CONFIG = {
  PASS: { label: "Pass", tone: "success" },
  NEEDS_REVIEW: { label: "Needs Review", tone: "warning" },
  FAIL: { label: "Fail", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: ScreeningToneName }>;

export type ScreeningRecommendation = keyof typeof RECOMMENDATION_CONFIG;

/** Score bands: 80+ green, 50–79 amber, below 50 red. */
export const getScoreTone = (score: number): ScreeningToneName => {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
};

type ScreeningStatusConfig = {
  label: string;
  tone: ScreeningToneName;
  /** Whether score, recommendation and skills are meaningful to show. */
  showResult: boolean;
  /** Shown above (or instead of) the result. */
  message?: string;
};

/**
 * Statuses n8n sends today are COMPLETED, MANUAL_REVIEW_REQUIRED and
 * UNREADABLE_RESUME; PENDING / PROCESSING / FAILED are handled in case the
 * workflow starts reporting them.
 */
export const SCREENING_STATUS_CONFIG: Record<string, ScreeningStatusConfig> = {
  COMPLETED: { label: "Completed", tone: "success", showResult: true },
  MANUAL_REVIEW_REQUIRED: {
    label: "Manual Review Required",
    tone: "warning",
    showResult: true,
    message:
      "The AI flagged this application for manual review. Treat the result below as a starting point.",
  },
  UNREADABLE_RESUME: {
    label: "Unreadable Resume",
    tone: "danger",
    showResult: false,
    message:
      "The AI couldn't read this candidate's resume, so no score was produced. Please review the resume manually.",
  },
  PENDING: {
    label: "Pending",
    tone: "neutral",
    showResult: false,
    message: "AI screening is still in progress. Check back in a few minutes.",
  },
  PROCESSING: {
    label: "Processing",
    tone: "neutral",
    showResult: false,
    message: "AI screening is still in progress. Check back in a few minutes.",
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
    showResult: false,
    message:
      "AI screening couldn't be completed for this candidate. Please review the application manually.",
  },
};

/** "needs review" / "Needs-Review" → "NEEDS_REVIEW". */
export const normalizeScreeningValue = (value: string | null | undefined) =>
  (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

export const getScreeningStatusConfig = (
  status: string,
): ScreeningStatusConfig =>
  SCREENING_STATUS_CONFIG[normalizeScreeningValue(status)] ?? {
    label: status || "Unknown",
    tone: "neutral",
    showResult: false,
    message: "The AI screening result isn't available in a final state yet.",
  };
