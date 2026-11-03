import type { EmailMessage, InboxThread, SendMode } from "@/lib/types/inbox";
import {
  BLOCKED_ATTACHMENT_EXTENSIONS,
  EMPTY_DRAFT,
  MAX_ATTACHMENT_BYTES,
} from "../(constants)/inbox.constants";
import type { ComposeDraft, ComposeInit } from "../(types)/inbox.types";

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const AVATAR_COLORS = [
  "#1f80b6",
  "#3bb8a4",
  "#7c5cff",
  "#f39c12",
  "#e05d8a",
  "#2f7fd0",
  "#0f766e",
];

/** Stable colour per person, so the same sender always looks the same. */
export const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const fullFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * The API serializes UTC DateTimes; values without an offset are UTC too, so
 * read them as such instead of as local time.
 */
export const parseApiDate = (iso: string) =>
  new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);

/** List time: "9:26 am" today, "Yesterday", else "Oct 27". */
export const formatListTime = (iso: string, now = new Date()) => {
  const date = parseApiDate(iso);
  if (isSameDay(date, now)) return timeFormatter.format(date).toLowerCase();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return monthDayFormatter.format(date);
};

/** "Fri, Oct 30, 2026, 9:26 AM". */
export const formatFullDateTime = (iso: string) => fullFormatter.format(parseApiDate(iso));

/** Matches the Candidates table: "11/4/2026, 10:00 am". */
export const formatSchedule = (iso: string | null) => {
  if (!iso) return "Not scheduled";
  const date = parseApiDate(iso);
  return `${date.toLocaleDateString("en-US")}, ${timeFormatter.format(date).toLowerCase()}`;
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export type AttachmentKind = "pdf" | "doc" | "image" | "other";

export const getAttachmentKind = (mimeType: string, filename: string): AttachmentKind => {
  const lower = `${mimeType} ${filename}`.toLowerCase();
  if (lower.includes("pdf")) return "pdf";
  if (lower.startsWith("image/")) return "image";
  if (/word|document|text\/|\.docx?\b|\.txt\b|\.rtf\b/.test(lower)) return "doc";
  return "other";
};

/** When a message was sent or received, for display. */
export const getMessageTime = (message: EmailMessage) =>
  message.receivedAt ?? message.sentAt ?? message.createdAt;

export const isThreadStarred = (thread: InboxThread) =>
  thread.messages.some((message) => message.isStarred);

/**
 * Addresses that are "us": senders of our outbound messages plus the
 * signed-in user's own email. Used to keep ourselves out of reply-all.
 */
const getOwnAddresses = (thread: InboxThread, userEmail?: string) => {
  const own = new Set(
    thread.messages
      .filter((message) => message.direction === "Outbound")
      .map((message) => message.fromEmail.toLowerCase()),
  );
  if (userEmail) own.add(userEmail.toLowerCase());
  return own;
};

/** The other party: the latest inbound sender, else the first recipient. */
export const getCounterpart = (thread: InboxThread) => {
  for (let index = thread.messages.length - 1; index >= 0; index--) {
    const message = thread.messages[index];
    if (message.direction === "Inbound") {
      return { name: message.fromName || message.fromEmail, email: message.fromEmail };
    }
  }
  const email = thread.messages[0]?.toEmails[0] ?? "";
  return { name: email, email };
};

export const getFirstName = (name: string) =>
  name.split(/[\s.@]+/)[0].replace(/^\w/, (char) => char.toUpperCase());

export const withPrefix = (prefix: string, subject: string) => {
  const trimmed = subject.trim();
  return trimmed.toLowerCase().startsWith(prefix.toLowerCase()) ? trimmed : `${prefix} ${trimmed}`;
};

const quote = (message: EmailMessage) =>
  `\n\nOn ${formatFullDateTime(getMessageTime(message))}, ${message.fromName || message.fromEmail} wrote:\n${message.bodyText
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")}`;

export type ReplyMode = "reply" | "replyAll" | "forward";

const SEND_MODES: Record<ReplyMode, SendMode> = {
  reply: "reply",
  replyAll: "reply_all",
  forward: "forward",
};

const REPLY_TITLES: Record<ReplyMode, string> = {
  reply: "Reply",
  replyAll: "Reply all",
  forward: "Forward",
};

/**
 * Prefills Reply / Reply all / Forward like the backend would. For Forward
 * the backend appends the original message and its attachments itself.
 */
export const buildReplyInit = (
  mode: ReplyMode,
  thread: InboxThread,
  message: EmailMessage,
  body = "",
  userEmail?: string,
): ComposeInit => {
  const base = {
    title: REPLY_TITLES[mode],
    mode: SEND_MODES[mode],
    replyToMessageId: message.id,
    threadId: thread.threadId,
  };

  if (mode === "forward") {
    return {
      ...base,
      draft: { ...EMPTY_DRAFT, subject: withPrefix("Fwd:", thread.subject), body },
    };
  }

  const own = getOwnAddresses(thread, userEmail);
  const notOwn = (email: string) => !own.has(email.toLowerCase());
  const to = message.direction === "Outbound" ? message.toEmails : [message.fromEmail];
  const cc =
    mode === "replyAll"
      ? [...new Set([...message.toEmails, ...message.ccEmails])].filter(
          (email) => notOwn(email) && !to.some((item) => item.toLowerCase() === email.toLowerCase()),
        )
      : [];

  return {
    ...base,
    draft: {
      ...EMPTY_DRAFT,
      to,
      cc,
      subject: withPrefix("Re:", thread.subject),
      body: `${body}${quote(message)}`,
    },
  };
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(email.trim());

export type DraftErrors = Partial<Record<"to" | "cc" | "bcc" | "subject" | "body" | "attachments", string>>;

/** Checks run before every send. An empty result means it can be sent. */
export const validateOutgoing = (
  draft: Pick<ComposeDraft, "to" | "cc" | "bcc" | "subject" | "body">,
  attachmentBytes = 0,
): DraftErrors => {
  const errors: DraftErrors = {};
  if (draft.to.length === 0) errors.to = "Add at least one recipient.";
  for (const field of ["to", "cc", "bcc"] as const) {
    const invalid = draft[field].find((email) => !isValidEmail(email));
    if (invalid) errors[field] = `"${invalid}" isn't a valid email address.`;
  }
  if (!draft.subject.trim()) errors.subject = "Add a subject.";
  if (!draft.body.trim()) errors.body = "Write a message.";
  if (attachmentBytes > MAX_ATTACHMENT_BYTES) {
    errors.attachments = "Attachments can't be more than 20 MB in total.";
  }
  return errors;
};

/** Why a file can't be attached, or null if it's fine. */
export const getAttachmentError = (file: { name: string; size: number }) => {
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (BLOCKED_ATTACHMENT_EXTENSIONS.has(extension)) return "This file type isn't allowed.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Files can't be larger than 20 MB.";
  return null;
};
