"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArchiveOutlined,
  ArrowBack,
  DeleteForeverOutlined,
  DeleteOutlined,
  Forward,
  MarkEmailUnreadOutlined,
  MoreVert,
  Reply,
  ReplyAll,
  RestoreFromTrash,
  Star,
  StarBorder,
} from "@mui/icons-material";
import type { EmailMessage, InboxThread } from "@/lib/types/inbox";
import { useAppSelector } from "@/lib/store/hooks";
import { INBOX_COLORS, LABELS, MARK_READ_DELAY_MS, isKnownLabel } from "../(constants)/inbox.constants";
import type { FolderId } from "../(types)/inbox.types";
import {
  formatFullDateTime,
  formatListTime,
  getAvatarColor,
  getCounterpart,
  getInitials,
  getMessageTime,
  isThreadStarred,
  type ReplyMode,
} from "../(utils)/inbox.utils";
import AttachmentCard from "./AttachmentCard";
import CandidateInfoCard from "./CandidateInfoCard";
import EmailBody from "./EmailBody";
import { LabelDot } from "./FolderList";
import QuickReply from "./QuickReply";

export type ThreadMove = "archive" | "trash" | "restore";

type MessageViewerProps = {
  thread: InboxThread;
  /** The folder it was opened from; decides Restore vs Archive/Trash. */
  folder: FolderId;
  canSend: boolean;
  /** Mobile/tablet single-pane mode: back to the list. */
  onBack?: () => void;
  onCompose: (mode: ReplyMode, message: EmailMessage, body?: string) => void;
  onMove: (action: ThreadMove) => void;
  /** Trash only; the caller confirms first. */
  onDeleteForever: () => void;
  onToggleStar: (starred: boolean) => void;
  onMarkUnread: () => void;
  /** Called once the thread has been open for a moment. */
  onMarkRead: () => void;
  onQuickReply: (body: string) => Promise<boolean>;
  isSendingQuickReply: boolean;
  onRetrySend: (messageId: string) => void;
};

const actionSx = {
  color: INBOX_COLORS.muted,
  "&:hover": { color: INBOX_COLORS.primary, bgcolor: INBOX_COLORS.hover },
} as const;

const senderOf = (message: EmailMessage) => message.fromName || message.fromEmail;

/** Mount with `key={thread.threadId}` so expanded messages reset per thread. */
export default function MessageViewer({
  thread,
  folder,
  canSend,
  onBack,
  onCompose,
  onMove,
  onDeleteForever,
  onToggleStar,
  onMarkUnread,
  onMarkRead,
  onQuickReply,
  isSendingQuickReply,
  onRetrySend,
}: Readonly<MessageViewerProps>) {
  const userEmail = useAppSelector((state) => state.user.currentUser?.email);
  const latest = thread.messages[thread.messages.length - 1];
  const counterpart = getCounterpart(thread);
  const starred = isThreadStarred(thread);
  const inTrash = folder === "trash";
  const canRestore = inTrash || folder === "archived";
  // Only the latest message starts expanded.
  const [expandedIds, setExpandedIds] = useState(() => new Set(latest ? [latest.id] : []));
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  // Mark read after the thread has been open briefly, not on a quick skim.
  const markReadRef = useRef(onMarkRead);
  useEffect(() => {
    markReadRef.current = onMarkRead;
  }, [onMarkRead]);
  useEffect(() => {
    const timer = setTimeout(() => markReadRef.current(), MARK_READ_DELAY_MS);
    return () => clearTimeout(timer);
  }, [thread.threadId]);

  const toggleExpanded = (messageId: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });

  if (!latest) return null;

  const actions = [
    ...(canSend
      ? [
          { label: "Reply", icon: <Reply />, onClick: () => onCompose("reply", latest) },
          { label: "Reply all", icon: <ReplyAll />, onClick: () => onCompose("replyAll", latest) },
          { label: "Forward", icon: <Forward />, onClick: () => onCompose("forward", latest) },
        ]
      : []),
    ...(canRestore
      ? [{ label: "Restore", icon: <RestoreFromTrash />, onClick: () => onMove("restore") }]
      : [{ label: "Archive", icon: <ArchiveOutlined />, onClick: () => onMove("archive") }]),
    inTrash
      ? { label: "Delete forever", icon: <DeleteForeverOutlined />, onClick: onDeleteForever }
      : { label: "Delete", icon: <DeleteOutlined />, onClick: () => onMove("trash") },
  ];

  const labels = thread.labels.filter(isKnownLabel);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      {/* Action bar */}
      <Stack
        direction="row"
        role="toolbar"
        aria-label="Message actions"
        sx={{
          alignItems: "center",
          px: 1,
          minHeight: 52,
          borderBottom: `1px solid ${INBOX_COLORS.divider}`,
        }}
      >
        {onBack && (
          <Tooltip title="Back to messages">
            <IconButton aria-label="Back to messages" onClick={onBack} sx={{ color: INBOX_COLORS.primary, mr: 0.5 }}>
              <ArrowBack />
            </IconButton>
          </Tooltip>
        )}
        {actions.map((action) => (
          <Tooltip key={action.label} title={action.label}>
            <IconButton aria-label={action.label} onClick={action.onClick} sx={actionSx}>
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={starred ? "Unstar" : "Star"}>
          <IconButton
            aria-label={starred ? "Unstar conversation" : "Star conversation"}
            aria-pressed={starred}
            onClick={() => onToggleStar(!starred)}
            sx={{ color: starred ? "#f5b400" : INBOX_COLORS.muted }}
          >
            {starred ? <Star /> : <StarBorder />}
          </IconButton>
        </Tooltip>
        <Tooltip title="More">
          <IconButton
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={Boolean(moreAnchor)}
            onClick={(event) => setMoreAnchor(event.currentTarget)}
            sx={actionSx}
          >
            <MoreVert />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={moreAnchor}
          open={Boolean(moreAnchor)}
          onClose={() => setMoreAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              setMoreAnchor(null);
              onMarkUnread();
            }}
          >
            <ListItemIcon><MarkEmailUnreadOutlined fontSize="small" /></ListItemIcon>
            Mark as unread
          </MenuItem>
          {!canRestore && (
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                onMove("restore");
              }}
              disabled={folder === "inbox"}
            >
              <ListItemIcon><RestoreFromTrash fontSize="small" /></ListItemIcon>
              Restore to Inbox
            </MenuItem>
          )}
        </Menu>
      </Stack>

      {/* Scrollable conversation */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 2, md: 3 }, py: 2.5 }}>
        <Typography
          component="h2"
          sx={{ fontWeight: 700, fontSize: { xs: "1.15rem", md: "1.35rem" }, color: INBOX_COLORS.heading, lineHeight: 1.3 }}
        >
          {thread.subject || "(no subject)"}
        </Typography>
        <Stack direction="row" spacing={0.8} sx={{ mt: 1, mb: 2, flexWrap: "wrap", rowGap: 0.8 }}>
          {labels.map((labelId) => (
            <Chip
              key={labelId}
              size="small"
              icon={<Box sx={{ pl: 0.8 }}><LabelDot color={LABELS[labelId].color} size={8} /></Box>}
              label={LABELS[labelId].label}
              sx={{
                fontWeight: 600,
                bgcolor: `${LABELS[labelId].color}14`,
                color: INBOX_COLORS.text,
              }}
            />
          ))}
        </Stack>

        {thread.candidate && (
          <Box sx={{ mb: 2.5 }}>
            <CandidateInfoCard candidate={thread.candidate} />
          </Box>
        )}

        <Stack divider={<Divider sx={{ borderColor: INBOX_COLORS.divider }} />}>
          {thread.messages.map((message) =>
            expandedIds.has(message.id) ? (
              <ExpandedMessage
                key={message.id}
                message={message}
                userEmail={userEmail}
                collapsible={message.id !== latest.id}
                canSend={canSend}
                onCollapse={() => toggleExpanded(message.id)}
                onRetry={() => onRetrySend(message.id)}
              />
            ) : (
              <CollapsedMessage key={message.id} message={message} onExpand={() => toggleExpanded(message.id)} />
            ),
          )}
        </Stack>
      </Box>

      {canSend && folder !== "drafts" && !inTrash && (
        <QuickReply
          threadId={thread.threadId}
          recipientName={counterpart.name}
          isSending={isSendingQuickReply}
          onSend={onQuickReply}
          onExpand={(body) => onCompose("reply", latest, body)}
        />
      )}
    </Box>
  );
}

function MessageHeaderAvatar({ message }: Readonly<{ message: EmailMessage }>) {
  return (
    <Avatar
      sx={{
        width: 40,
        height: 40,
        fontSize: "0.9rem",
        fontWeight: 700,
        bgcolor: getAvatarColor(message.fromEmail),
      }}
    >
      {getInitials(senderOf(message))}
    </Avatar>
  );
}

function CollapsedMessage({
  message,
  onExpand,
}: Readonly<{ message: EmailMessage; onExpand: () => void }>) {
  return (
    <ButtonBase
      onClick={onExpand}
      aria-expanded={false}
      aria-label={`Expand message from ${senderOf(message)}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        width: "100%",
        py: 1.3,
        px: 1,
        mx: -1,
        textAlign: "left",
        borderRadius: 2,
        "&:hover": { bgcolor: INBOX_COLORS.hover },
        "&.Mui-focusVisible": { outline: `2px solid ${INBOX_COLORS.primary}` },
      }}
    >
      <MessageHeaderAvatar message={message} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: "0.9rem", fontWeight: 700, color: INBOX_COLORS.text }}>
          {senderOf(message)}
        </Typography>
        <Typography noWrap variant="body2" sx={{ color: INBOX_COLORS.muted }}>
          {message.bodyText.replace(/\s+/g, " ").trim()}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: INBOX_COLORS.muted, flexShrink: 0 }}>
        {formatListTime(getMessageTime(message))}
      </Typography>
    </ButtonBase>
  );
}

const STATUS_CHIPS: Partial<Record<EmailMessage["status"], { label: string; color: string; bg: string }>> = {
  Sending: { label: "Sending…", color: "#1f80b6", bg: "#e8f3fc" },
  Draft: { label: "Draft", color: "#e53935", bg: "#fdecec" },
};

function ExpandedMessage({
  message,
  userEmail,
  collapsible,
  canSend,
  onCollapse,
  onRetry,
}: Readonly<{
  message: EmailMessage;
  userEmail?: string;
  collapsible: boolean;
  canSend: boolean;
  onCollapse: () => void;
  onRetry: () => void;
}>) {
  const formatAddress = (email: string) =>
    userEmail && email.toLowerCase() === userEmail.toLowerCase() ? "me" : email;
  const recipients = message.toEmails.map(formatAddress).join(", ");
  const cc = message.ccEmails.map(formatAddress).join(", ");
  const statusChip = STATUS_CHIPS[message.status];

  const header = (
    <>
      <MessageHeaderAvatar message={message} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.92rem", color: INBOX_COLORS.text }} noWrap>
          <Box component="span" sx={{ fontWeight: 700, color: INBOX_COLORS.heading }}>
            {senderOf(message)}
          </Box>{" "}
          <Box component="span" sx={{ color: INBOX_COLORS.muted, fontSize: "0.82rem" }}>
            &lt;{message.fromEmail}&gt;
          </Box>
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: INBOX_COLORS.muted }}>
          to {recipients || "—"}
          {cc && `, cc ${cc}`}
        </Typography>
      </Box>
      <Stack sx={{ alignItems: "flex-end", flexShrink: 0 }} spacing={0.5}>
        <Typography variant="caption" sx={{ color: INBOX_COLORS.muted, textAlign: "right" }}>
          {formatFullDateTime(getMessageTime(message))}
        </Typography>
        {statusChip && (
          <Chip
            size="small"
            label={statusChip.label}
            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, color: statusChip.color, bgcolor: statusChip.bg }}
          />
        )}
      </Stack>
    </>
  );

  return (
    <Box component="article" sx={{ py: 2 }}>
      {collapsible ? (
        <ButtonBase
          onClick={onCollapse}
          aria-expanded
          aria-label={`Collapse message from ${senderOf(message)}`}
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            width: "100%",
            textAlign: "left",
            borderRadius: 2,
            "&.Mui-focusVisible": { outline: `2px solid ${INBOX_COLORS.primary}` },
          }}
        >
          {header}
        </ButtonBase>
      ) : (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
          {header}
        </Stack>
      )}

      <Box sx={{ pl: { xs: 0, sm: 6.5 }, pt: 1.5 }}>
        {message.status === "Failed" && (
          <Alert
            severity="error"
            sx={{ mb: 1.5, borderRadius: 2 }}
            action={
              canSend ? (
                <Button color="inherit" size="small" onClick={onRetry} sx={{ fontWeight: 700 }}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            <Box component="span" sx={{ fontWeight: 700 }}>Failed to send</Box>
            {message.errorMessage && (
              <Box component="span" sx={{ display: "block" }}>
                {message.errorMessage}
              </Box>
            )}
          </Alert>
        )}

        <EmailBody html={message.bodyHtml} />

        {message.attachments.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ display: "block", color: INBOX_COLORS.muted, fontWeight: 600, mb: 1 }}>
              {message.attachments.length} attachment{message.attachments.length === 1 ? "" : "s"}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.2 }}>
              {message.attachments.map((attachment) => (
                <AttachmentCard key={attachment.id} attachment={attachment} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
