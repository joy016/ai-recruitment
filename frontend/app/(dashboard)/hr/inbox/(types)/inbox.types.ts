import type {
  InboxAttachment,
  InboxFilter,
  InboxFolder,
  InboxLabel,
  InboxSort,
  SendMode,
} from "@/lib/types/inbox";

// API DTOs live in lib/types/inbox.ts; these are the UI's names for them.
export type FolderId = InboxFolder;
export type LabelId = InboxLabel;
export type MessageFilter = InboxFilter;
export type MessageSort = InboxSort;

/** What the composer edits. `body` is plain text, sent as simple HTML. */
export interface ComposeDraft {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  /** Already uploaded (e.g. from a saved draft). */
  attachments: InboxAttachment[];
}

/** Everything needed to open the composer. */
export interface ComposeInit {
  title: string;
  mode: SendMode;
  draft: ComposeDraft;
  replyToMessageId?: string;
  /** Set when reopening a saved draft. */
  draftId?: string;
  threadId?: string;
}

export interface KnownRecipient {
  email: string;
  name: string;
}
