/**
 * DTOs for the HR Inbox API (backend Features/Inbox/Dto). Field names match
 * the backend's camelCase JSON; dates are ISO strings.
 */

export type InboxFolder =
  | "inbox"
  | "sent"
  | "drafts"
  | "starred"
  | "archived"
  | "trash";

export type InboxLabel = "applicants" | "interviews" | "offers" | "rejections";

/** GET /api/inbox/messages `filter`. */
export type InboxFilter = "all" | "unread" | "attachments" | "candidate_replies";

/** GET /api/inbox/messages `sort`; the backend only orders by last activity. */
export type InboxSort = "newest" | "oldest";

/** C# enum names, serialized with ToString(). */
export type EmailDirection = "Inbound" | "Outbound";
export type EmailStatus = "Draft" | "Sending" | "Sent" | "Failed" | "Received";

export type SendMode = "new" | "reply" | "reply_all" | "forward";

export type BulkAction = "archive" | "trash" | "markRead" | "markUnread" | "restore";

/** Read-only snapshot of the linked candidate. The Inbox never writes it. */
export interface CandidateCard {
  id: string;
  fullName: string;
  jobAppliedFor: string | null;
  yearsOfExperience: number;
  status: string;
  interviewSchedule: string | null;
}

export interface InboxAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Short-lived signed URL; regenerated on every response, never cache it. */
  url: string | null;
}

/** One row of the message list: a conversation summary. */
export interface InboxThreadListItem {
  threadId: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  preview: string;
  messageCount: number;
  unreadCount: number;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
  lastActivityAt: string;
  candidate: CandidateCard | null;
}

export interface InboxThreadListResponse {
  items: InboxThreadListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InboxCounts {
  /** inbox = unread conversations; the rest are totals. */
  folders: Partial<Record<InboxFolder, number>>;
  labels: Record<string, number>;
  totalUnread: number;
}

export interface EmailMessage {
  id: string;
  direction: EmailDirection;
  fromName: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  /** Sanitized by the backend; sanitize again before rendering. */
  bodyHtml: string;
  bodyText: string;
  status: EmailStatus;
  errorMessage: string | null;
  isRead: boolean;
  isStarred: boolean;
  attachments: InboxAttachment[];
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
}

export interface InboxThread {
  threadId: string;
  subject: string;
  labels: string[];
  /** Oldest first. */
  messages: EmailMessage[];
  candidate: CandidateCard | null;
}

export interface GetMessagesParams {
  folder: InboxFolder;
  search?: string;
  filter?: InboxFilter;
  label?: InboxLabel | null;
  sort?: InboxSort;
  page?: number;
  pageSize?: number;
}

export interface PatchMessagePayload {
  isRead?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  labels?: string[];
}

export interface SaveDraftPayload {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  attachmentIds: string[];
  replyToMessageId?: string | null;
  templateId?: string | null;
}

export interface SendEmailPayload extends SaveDraftPayload {
  mode: SendMode;
  draftId?: string | null;
}

export interface SendEmailResponse {
  messageId: string;
  status: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface RenderedTemplate {
  subject: string;
  bodyHtml: string;
}

export interface AiWritePayload {
  prompt: string;
  tone?: string;
  recipientName?: string;
}

/** The backend has no `source` flag, so a fallback reply can't be told apart. */
export interface AiWriteResponse {
  subject: string | null;
  bodyHtml: string;
}

export interface AiSuggestReplyResponse {
  suggestions: string[];
}

/** Server-sent events from GET /api/inbox/events. */
export type InboxEvent =
  | { type: "message.received"; data: { messageId: string; threadId: string } }
  | { type: "message.sent"; data: { messageId: string; error: string | null } }
  | { type: "message.failed"; data: { messageId: string; error: string | null } }
  | { type: "counts.updated"; data: Record<string, never> };
