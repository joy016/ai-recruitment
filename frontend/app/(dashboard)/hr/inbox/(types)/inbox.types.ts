export type FolderId =
  | "inbox"
  | "sent"
  | "drafts"
  | "starred"
  | "archived"
  | "trash";

export type LabelId = "applicants" | "interviews" | "offers" | "rejections";

export type MessageFilter = "all" | "unread" | "attachments" | "candidates";

export type MessageSort = "newest" | "oldest" | "sender" | "unread";

export interface Contact {
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  /** Display size, e.g. "248 KB". */
  size: string;
  kind: "pdf" | "doc" | "image" | "other";
}

export interface InboxMessage {
  id: string;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  /** ISO timestamp (UTC). */
  sentAt: string;
  /** Plain text; blank lines separate paragraphs. */
  body: string;
  attachments: Attachment[];
}

/** A conversation; `messages` is oldest first. */
export interface InboxThread {
  id: string;
  subject: string;
  /** Real folder. "starred" is a view over every folder, not a location. */
  folder: Exclude<FolderId, "starred">;
  labels: LabelId[];
  isStarred: boolean;
  isUnread: boolean;
  messages: InboxMessage[];
}

export interface MockCandidate {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  yearsOfExperience: number;
  status: string;
  /** ISO timestamp; null when nothing is scheduled. */
  interviewSchedule: string | null;
}

export interface ComposeDraft {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}
