import type { SvgIconComponent } from "@mui/icons-material";
import {
  ArchiveOutlined,
  DeleteOutlined,
  DraftsOutlined,
  InboxOutlined,
  SendOutlined,
  StarBorder,
} from "@mui/icons-material";
import type {
  ComposeDraft,
  FolderId,
  LabelId,
  MessageFilter,
  MessageSort,
} from "../(types)/inbox.types";

/** Shared look, matching the Candidates page card and table. */
export const INBOX_COLORS = {
  primary: "#1f80b6",
  heading: "#17456a",
  text: "#264a66",
  muted: "#5f7f96",
  subtle: "#52718c",
  border: "#d7e8f5",
  divider: "#e1eef7",
  hover: "#f5faff",
  selected: "#e8f3fc",
  surface: "#f7fbff",
} as const;

export const FOLDERS: { id: FolderId; label: string; icon: SvgIconComponent }[] = [
  { id: "inbox", label: "Inbox", icon: InboxOutlined },
  { id: "sent", label: "Sent", icon: SendOutlined },
  { id: "drafts", label: "Drafts", icon: DraftsOutlined },
  { id: "starred", label: "Starred", icon: StarBorder },
  { id: "archived", label: "Archived", icon: ArchiveOutlined },
  { id: "trash", label: "Trash", icon: DeleteOutlined },
];

export const LABELS: Record<LabelId, { label: string; color: string }> = {
  applicants: { label: "Applicants", color: "#1f80b6" },
  interviews: { label: "Interviews", color: "#f39c12" },
  offers: { label: "Offers", color: "#1c8758" },
  rejections: { label: "Rejections", color: "#e53935" },
};

export const LABEL_IDS = Object.keys(LABELS) as LabelId[];

export const isKnownLabel = (label: string): label is LabelId => label in LABELS;

export const MESSAGE_FILTERS: { id: MessageFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "attachments", label: "With attachments" },
  { id: "candidate_replies", label: "Candidate replies" },
];

// The API only orders by last activity.
export const MESSAGE_SORTS: { id: MessageSort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
];

/**
 * Pill colours per applicant status, like the table's status chips.
 * TODO(wire-up): use the colours from GET /api/ApplicantStatus instead.
 */
export const CANDIDATE_STATUS_COLORS: Record<string, string> = {
  "AI Screening passed": "#6d8fd6",
  "Initial Interview": "#4aa3df",
  "Technical Interview": "#2f90c5",
  "Final Interview": "#f39c12",
  "Job Offer": "#3bb8a4",
  Onboarding: "#1c8758",
  Rejected: "#e53935",
};

export const EMPTY_DRAFT: ComposeDraft = {
  to: [],
  cc: [],
  bcc: [],
  subject: "",
  body: "",
  attachments: [],
};

/** Mirrors the backend's InboxAttachmentPolicy. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".msp", ".scr", ".ps1", ".psm1",
  ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".sh", ".bash", ".app",
  ".dll", ".jar", ".apk", ".gadget", ".cpl", ".reg",
]);

export const AI_TONES = ["Professional", "Friendly", "Formal", "Concise"] as const;

/** Debounces. */
export const SEARCH_DEBOUNCE_MS = 350;
export const DRAFT_AUTOSAVE_MS = 2000;
/** How long a conversation stays open before it is marked read. */
export const MARK_READ_DELAY_MS = 1000;
