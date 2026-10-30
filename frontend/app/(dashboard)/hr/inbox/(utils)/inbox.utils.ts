import type {
  Contact,
  FolderId,
  InboxMessage,
  InboxThread,
  LabelId,
  MessageFilter,
  MessageSort,
  MockCandidate,
} from "../(types)/inbox.types";
import { CURRENT_USER, findCandidateByEmail } from "../(constants)/mockInbox";

export const getLatestMessage = (thread: InboxThread): InboxMessage =>
  thread.messages[thread.messages.length - 1];

const isMe = (contact: Contact) =>
  contact.email.toLowerCase() === CURRENT_USER.email.toLowerCase();

/** The other party: the latest sender who isn't us, else the first recipient. */
export const getCounterpart = (thread: InboxThread): Contact => {
  for (let index = thread.messages.length - 1; index >= 0; index--) {
    const { from } = thread.messages[index];
    if (!isMe(from)) return from;
  }
  return thread.messages[0].to[0] ?? CURRENT_USER;
};

export const getThreadCandidate = (thread: InboxThread): MockCandidate | null => {
  for (const message of thread.messages) {
    for (const contact of [message.from, ...message.to]) {
      const candidate = isMe(contact) ? null : findCandidateByEmail(contact.email);
      if (candidate) return candidate;
    }
  }
  return null;
};

export const threadHasAttachments = (thread: InboxThread) =>
  thread.messages.some((message) => message.attachments.length > 0);

/** The latest message was sent by a known candidate. */
export const isCandidateReply = (thread: InboxThread) =>
  findCandidateByEmail(getLatestMessage(thread).from.email) !== null;

export const getPreview = (message: InboxMessage) =>
  message.body.replace(/\s+/g, " ").trim();

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

export const formatContact = (contact: Contact) =>
  isMe(contact) ? "me" : contact.name;

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

/** List time: "9:26 am" today, "Yesterday", else "Oct 27". */
export const formatListTime = (iso: string, now = new Date()) => {
  const date = new Date(iso);
  if (isSameDay(date, now)) return timeFormatter.format(date).toLowerCase();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return monthDayFormatter.format(date);
};

/** "Fri, Oct 30, 2026, 9:26 AM". */
export const formatFullDateTime = (iso: string) =>
  fullFormatter.format(new Date(iso));

/** Matches the Candidates table: "11/4/2026, 10:00 am". */
export const formatSchedule = (iso: string | null) => {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-US")}, ${timeFormatter.format(date).toLowerCase()}`;
};

export const getFirstName = (nameOrEmail: string) => {
  const candidate = findCandidateByEmail(nameOrEmail);
  const name = candidate?.name ?? nameOrEmail.split("@")[0];
  return name.split(/[\s.]+/)[0].replace(/^\w/, (char) => char.toUpperCase());
};

export const fillName = (text: string, name: string) =>
  text.replaceAll("{name}", name || "there");

export const isInFolder = (thread: InboxThread, folder: FolderId) =>
  folder === "starred"
    ? thread.isStarred && thread.folder !== "trash"
    : thread.folder === folder;

export const getFolderCount = (threads: InboxThread[], folder: FolderId) => {
  const inFolder = threads.filter((thread) => isInFolder(thread, folder));
  // Inbox shows unread; the rest show totals.
  return folder === "inbox"
    ? inFolder.filter((thread) => thread.isUnread).length
    : inFolder.length;
};

type VisibleThreadsOptions = {
  folder: FolderId;
  label: LabelId | null;
  filter: MessageFilter;
  sort: MessageSort;
  search: string;
};

export const getVisibleThreads = (
  threads: InboxThread[],
  { folder, label, filter, sort, search }: VisibleThreadsOptions,
) => {
  const query = search.trim().toLowerCase();

  const visible = threads.filter((thread) => {
    if (label ? thread.folder === "trash" || !thread.labels.includes(label) : !isInFolder(thread, folder)) {
      return false;
    }
    if (filter === "unread" && !thread.isUnread) return false;
    if (filter === "attachments" && !threadHasAttachments(thread)) return false;
    if (filter === "candidates" && !isCandidateReply(thread)) return false;
    if (!query) return true;

    const haystack = [
      thread.subject,
      ...thread.messages.flatMap((message) => [
        message.body,
        message.from.name,
        message.from.email,
        ...message.to.map((contact) => contact.name),
      ]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const latestTime = (thread: InboxThread) =>
    new Date(getLatestMessage(thread).sentAt).getTime();

  return visible.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return latestTime(a) - latestTime(b);
      case "sender":
        return getCounterpart(a).name.localeCompare(getCounterpart(b).name);
      case "unread":
        return Number(b.isUnread) - Number(a.isUnread) || latestTime(b) - latestTime(a);
      default:
        return latestTime(b) - latestTime(a);
    }
  });
};
