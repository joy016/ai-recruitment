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

export const MESSAGE_FILTERS: { id: MessageFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "attachments", label: "With attachments" },
  { id: "candidates", label: "Candidate replies" },
];

export const MESSAGE_SORTS: { id: MessageSort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "sender", label: "Sender (A–Z)" },
  { id: "unread", label: "Unread first" },
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
};

export type EmailTemplateId =
  | "interviewInvitation"
  | "rejectionNotice"
  | "jobOffer"
  | "requestDocuments";

/** `{name}` is replaced with the first recipient's first name. */
export const EMAIL_TEMPLATES: Record<
  EmailTemplateId,
  { label: string; subject: string; body: string }
> = {
  interviewInvitation: {
    label: "Interview Invitation",
    subject: "Interview Invitation – Next Steps",
    body: "Hi {name},\n\nThank you for your interest in joining our team. We'd like to invite you to an interview to discuss your experience in more detail.\n\nPlease let us know which of the following slots works best for you, and we'll send a calendar invite.\n\nBest regards,\nHR Recruitment Team",
  },
  rejectionNotice: {
    label: "Rejection Notice",
    subject: "Update on Your Application",
    body: "Hi {name},\n\nThank you for taking the time to apply and for your interest in our company. After careful consideration, we've decided to move forward with other candidates whose experience more closely matches the role.\n\nWe'll keep your profile on file for future openings.\n\nKind regards,\nHR Recruitment Team",
  },
  jobOffer: {
    label: "Job Offer",
    subject: "Job Offer – Welcome Aboard!",
    body: "Hi {name},\n\nWe're delighted to offer you the position! Attached you'll find the offer letter with the compensation and start date details.\n\nPlease review it and let us know if you have any questions. We're excited to have you on the team.\n\nBest regards,\nHR Recruitment Team",
  },
  requestDocuments: {
    label: "Request for Documents",
    subject: "Request for Pre-Employment Documents",
    body: "Hi {name},\n\nTo continue with your application, please send us the following documents:\n\n• Government-issued ID\n• Certificate of Employment from previous employers\n• Transcript of Records\n\nYou can reply to this email with the files attached.\n\nThank you,\nHR Recruitment Team",
  },
};

export const EMAIL_TEMPLATE_IDS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateId[];

// TODO(wire-up): replace the canned text with the AI endpoint's response.
export const MOCK_AI_REPLY =
  "Hi {name},\n\nThank you for getting back to us. I've noted your message and will coordinate with the hiring team. I'll follow up with the confirmed details within the day.\n\nBest regards,\nHR Recruitment Team";

export const MOCK_AI_DRAFT =
  "Hi {name},\n\nI hope you're doing well. I'm reaching out regarding your application. Based on your experience, we'd love to continue the conversation and share the next steps in our hiring process.\n\nPlease let me know a convenient time to connect this week.\n\nBest regards,\nHR Recruitment Team";

/** How long the mock AI "thinks" before filling text. */
export const MOCK_AI_DELAY_MS = 900;
