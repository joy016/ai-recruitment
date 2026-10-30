"use client";

import { useState } from "react";
import {
  Avatar,
  Box,
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
  DeleteOutlined,
  Forward,
  LabelOutlined,
  MarkEmailUnreadOutlined,
  MoreVert,
  PrintOutlined,
  Reply,
  ReplyAll,
  Star,
  StarBorder,
} from "@mui/icons-material";
import { INBOX_COLORS, LABELS } from "../(constants)/inbox.constants";
import type { Attachment, InboxMessage, InboxThread } from "../(types)/inbox.types";
import {
  formatContact,
  formatFullDateTime,
  formatListTime,
  getAvatarColor,
  getCounterpart,
  getFirstName,
  getInitials,
  getPreview,
  getThreadCandidate,
} from "../(utils)/inbox.utils";
import AttachmentCard from "./AttachmentCard";
import CandidateInfoCard from "./CandidateInfoCard";
import { LabelDot } from "./FolderList";
import QuickReply from "./QuickReply";
import ScheduleInterviewDialog from "./ScheduleInterviewDialog";

export type ReplyMode = "reply" | "replyAll" | "forward";

type MessageViewerProps = {
  thread: InboxThread;
  /** Mobile/tablet single-pane mode: back to the list. */
  onBack?: () => void;
  onCompose: (mode: ReplyMode, message: InboxMessage, body?: string) => void;
  onArchive: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onToggleStar: (threadId: string) => void;
  onMarkUnread: (threadId: string) => void;
  /** Shows a toast; used for actions that are design-only for now. */
  onNotify: (message: string) => void;
};

const actionSx = {
  color: INBOX_COLORS.muted,
  "&:hover": { color: INBOX_COLORS.primary, bgcolor: INBOX_COLORS.hover },
} as const;

/** Mount with `key={thread.id}` so expanded messages reset per thread. */
export default function MessageViewer({
  thread,
  onBack,
  onCompose,
  onArchive,
  onDelete,
  onToggleStar,
  onMarkUnread,
  onNotify,
}: Readonly<MessageViewerProps>) {
  const latest = thread.messages[thread.messages.length - 1];
  const candidate = getThreadCandidate(thread);
  const counterpart = getCounterpart(thread);
  // Only the latest message starts expanded.
  const [expandedIds, setExpandedIds] = useState(() => new Set([latest.id]));
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const toggleExpanded = (messageId: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });

  const downloadAttachment = (attachment: Attachment) =>
    onNotify(`Download of ${attachment.fileName} isn't connected yet.`);

  const actions = [
    { label: "Reply", icon: <Reply />, onClick: () => onCompose("reply", latest) },
    { label: "Reply all", icon: <ReplyAll />, onClick: () => onCompose("replyAll", latest) },
    { label: "Forward", icon: <Forward />, onClick: () => onCompose("forward", latest) },
    { label: "Archive", icon: <ArchiveOutlined />, onClick: () => onArchive(thread.id) },
    { label: "Delete", icon: <DeleteOutlined />, onClick: () => onDelete(thread.id) },
  ];

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
        <Tooltip title={thread.isStarred ? "Unstar" : "Star"}>
          <IconButton
            aria-label={thread.isStarred ? "Unstar conversation" : "Star conversation"}
            aria-pressed={thread.isStarred}
            onClick={() => onToggleStar(thread.id)}
            sx={{ color: thread.isStarred ? "#f5b400" : INBOX_COLORS.muted }}
          >
            {thread.isStarred ? <Star /> : <StarBorder />}
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
              onMarkUnread(thread.id);
            }}
          >
            <ListItemIcon><MarkEmailUnreadOutlined fontSize="small" /></ListItemIcon>
            Mark as unread
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMoreAnchor(null);
              onNotify("Labels can't be edited yet.");
            }}
          >
            <ListItemIcon><LabelOutlined fontSize="small" /></ListItemIcon>
            Change labels
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMoreAnchor(null);
              onNotify("Printing isn't connected yet.");
            }}
          >
            <ListItemIcon><PrintOutlined fontSize="small" /></ListItemIcon>
            Print
          </MenuItem>
        </Menu>
      </Stack>

      {/* Scrollable conversation */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 2, md: 3 }, py: 2.5 }}>
        <Typography
          component="h2"
          sx={{ fontWeight: 700, fontSize: { xs: "1.15rem", md: "1.35rem" }, color: INBOX_COLORS.heading, lineHeight: 1.3 }}
        >
          {thread.subject}
        </Typography>
        <Stack direction="row" spacing={0.8} sx={{ mt: 1, mb: 2, flexWrap: "wrap", rowGap: 0.8 }}>
          {thread.labels.map((labelId) => (
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

        {candidate && (
          <Box sx={{ mb: 2.5 }}>
            <CandidateInfoCard candidate={candidate} onScheduleInterview={() => setScheduleOpen(true)} />
          </Box>
        )}

        <Stack divider={<Divider sx={{ borderColor: INBOX_COLORS.divider }} />}>
          {thread.messages.map((message) =>
            expandedIds.has(message.id) ? (
              <ExpandedMessage
                key={message.id}
                message={message}
                collapsible={message.id !== latest.id}
                onCollapse={() => toggleExpanded(message.id)}
                onDownload={downloadAttachment}
              />
            ) : (
              <CollapsedMessage key={message.id} message={message} onExpand={() => toggleExpanded(message.id)} />
            ),
          )}
        </Stack>
      </Box>

      {thread.folder !== "drafts" && thread.folder !== "trash" && (
        <QuickReply
          recipientName={counterpart.name}
          recipientFirstName={getFirstName(counterpart.email)}
          onSend={() => onNotify("Preview only: sending isn't connected yet.")}
          onExpand={(body) => onCompose("reply", latest, body)}
        />
      )}

      {candidate && scheduleOpen && (
        <ScheduleInterviewDialog
          open
          candidateName={candidate.name}
          onClose={() => setScheduleOpen(false)}
          onSchedule={(summary) => onNotify(`Preview only: ${summary} not saved.`)}
        />
      )}
    </Box>
  );
}

function MessageHeaderAvatar({ message }: Readonly<{ message: InboxMessage }>) {
  return (
    <Avatar
      sx={{
        width: 40,
        height: 40,
        fontSize: "0.9rem",
        fontWeight: 700,
        bgcolor: getAvatarColor(message.from.email),
      }}
    >
      {getInitials(message.from.name)}
    </Avatar>
  );
}

function CollapsedMessage({
  message,
  onExpand,
}: Readonly<{ message: InboxMessage; onExpand: () => void }>) {
  return (
    <ButtonBase
      onClick={onExpand}
      aria-expanded={false}
      aria-label={`Expand message from ${message.from.name}`}
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
          {message.from.name}
        </Typography>
        <Typography noWrap variant="body2" sx={{ color: INBOX_COLORS.muted }}>
          {getPreview(message)}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: INBOX_COLORS.muted, flexShrink: 0 }}>
        {formatListTime(message.sentAt)}
      </Typography>
    </ButtonBase>
  );
}

function ExpandedMessage({
  message,
  collapsible,
  onCollapse,
  onDownload,
}: Readonly<{
  message: InboxMessage;
  collapsible: boolean;
  onCollapse: () => void;
  onDownload: (attachment: Attachment) => void;
}>) {
  const recipients = message.to.map(formatContact).join(", ");
  const cc = message.cc?.map(formatContact).join(", ");

  const header = (
    <>
      <MessageHeaderAvatar message={message} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.92rem", color: INBOX_COLORS.text }} noWrap>
          <Box component="span" sx={{ fontWeight: 700, color: INBOX_COLORS.heading }}>
            {message.from.name}
          </Box>{" "}
          <Box component="span" sx={{ color: INBOX_COLORS.muted, fontSize: "0.82rem" }}>
            &lt;{message.from.email}&gt;
          </Box>
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: INBOX_COLORS.muted }}>
          to {recipients}
          {cc && `, cc ${cc}`}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: INBOX_COLORS.muted, flexShrink: 0, textAlign: "right" }}>
        {formatFullDateTime(message.sentAt)}
      </Typography>
    </>
  );

  return (
    <Box component="article" sx={{ py: 2 }}>
      {collapsible ? (
        <ButtonBase
          onClick={onCollapse}
          aria-expanded
          aria-label={`Collapse message from ${message.from.name}`}
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
        {message.body.split(/\n{2,}/).map((paragraph, index) => (
          <Typography
            key={index}
            sx={{ fontSize: "0.92rem", color: INBOX_COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line", mb: 1.5 }}
          >
            {paragraph}
          </Typography>
        ))}

        {message.attachments.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ display: "block", color: INBOX_COLORS.muted, fontWeight: 600, mb: 1 }}>
              {message.attachments.length} attachment{message.attachments.length === 1 ? "" : "s"}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.2 }}>
              {message.attachments.map((attachment) => (
                <AttachmentCard key={attachment.id} attachment={attachment} onDownload={onDownload} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
