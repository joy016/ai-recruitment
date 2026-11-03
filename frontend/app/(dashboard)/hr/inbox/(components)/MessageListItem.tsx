import {
  Avatar,
  Box,
  ButtonBase,
  Checkbox,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AttachFile, Star, StarBorder } from "@mui/icons-material";
import type { InboxThreadListItem } from "@/lib/types/inbox";
import { INBOX_COLORS, LABELS, isKnownLabel } from "../(constants)/inbox.constants";
import { formatListTime, getAvatarColor, getInitials } from "../(utils)/inbox.utils";
import CandidateStatusChip from "./CandidateStatusChip";
import { LabelDot } from "./FolderList";

type MessageListItemProps = {
  thread: InboxThreadListItem;
  selected: boolean;
  checked: boolean;
  isDraft: boolean;
  onOpen: (threadId: string) => void;
  onToggleCheck: (threadId: string) => void;
  onToggleStar: (threadId: string, starred: boolean) => void;
};

export default function MessageListItem({
  thread,
  selected,
  checked,
  isDraft,
  onOpen,
  onToggleCheck,
  onToggleStar,
}: Readonly<MessageListItemProps>) {
  const senderName = thread.senderName || thread.senderEmail;
  const subject = thread.subject || "(no subject)";
  const unread = thread.unreadCount > 0;
  const count = thread.messageCount;
  const labels = thread.labels.filter(isKnownLabel);

  return (
    <Box
      component="li"
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 0.5,
        pl: 0.5,
        pr: 1,
        borderBottom: `1px solid ${INBOX_COLORS.divider}`,
        bgcolor: selected ? INBOX_COLORS.selected : unread ? "#ffffff" : "#fbfdff",
        transition: "background-color 120ms",
        "&:hover": { bgcolor: selected ? INBOX_COLORS.selected : INBOX_COLORS.hover },
        // Accent bar on the open message, like the sidebar's active item.
        "&::before": selected
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 3,
              bgcolor: INBOX_COLORS.primary,
            }
          : undefined,
      }}
    >
      <Checkbox
        size="small"
        checked={checked}
        onChange={() => onToggleCheck(thread.threadId)}
        slotProps={{ input: { "aria-label": `Select "${subject}"` } }}
        sx={{ mt: 1.3, color: "#9bb7c9" }}
      />

      <ButtonBase
        onClick={() => onOpen(thread.threadId)}
        aria-current={selected ? "true" : undefined}
        aria-label={`${unread ? "Unread. " : ""}${senderName}: ${subject}`}
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: 1.3,
          py: 1.4,
          textAlign: "left",
          borderRadius: 2,
          "&.Mui-focusVisible": {
            outline: `2px solid ${INBOX_COLORS.primary}`,
            outlineOffset: -2,
          },
        }}
      >
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              fontSize: "0.85rem",
              fontWeight: 700,
              bgcolor: getAvatarColor(thread.senderEmail),
            }}
          >
            {getInitials(senderName)}
          </Avatar>
          {unread && (
            <Box
              aria-hidden="true"
              sx={{
                position: "absolute",
                top: -1,
                right: -1,
                width: 11,
                height: 11,
                borderRadius: "50%",
                bgcolor: INBOX_COLORS.primary,
                border: "2px solid #ffffff",
              }}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
            <Typography
              noWrap
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: "0.92rem",
                fontWeight: unread ? 800 : 600,
                color: unread ? INBOX_COLORS.heading : INBOX_COLORS.text,
              }}
            >
              {isDraft && (
                <Box component="span" sx={{ color: "#e53935", mr: 0.5 }}>
                  Draft
                </Box>
              )}
              {senderName}
              {count > 1 && (
                <Box component="span" sx={{ color: INBOX_COLORS.muted, fontWeight: 500, ml: 0.6 }}>
                  {count}
                </Box>
              )}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                flexShrink: 0,
                fontWeight: unread ? 700 : 500,
                color: unread ? INBOX_COLORS.primary : INBOX_COLORS.muted,
              }}
            >
              {formatListTime(thread.lastActivityAt)}
            </Typography>
          </Stack>

          <Typography
            noWrap
            sx={{
              fontSize: "0.86rem",
              fontWeight: unread ? 700 : 500,
              color: unread ? INBOX_COLORS.heading : INBOX_COLORS.text,
              mt: 0.2,
            }}
          >
            {subject}
          </Typography>

          <Typography noWrap variant="body2" sx={{ color: INBOX_COLORS.muted, fontSize: "0.82rem" }}>
            {thread.preview}
          </Typography>

          {(thread.candidate || labels.length > 0) && (
            <Stack direction="row" spacing={0.6} sx={{ mt: 0.7, alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
              {thread.candidate && <CandidateStatusChip status={thread.candidate.status} compact />}
              {labels.map((labelId) => (
                <Stack
                  key={labelId}
                  direction="row"
                  spacing={0.5}
                  sx={{
                    alignItems: "center",
                    px: 0.8,
                    height: 20,
                    borderRadius: 999,
                    bgcolor: `${LABELS[labelId].color}14`,
                  }}
                >
                  <LabelDot color={LABELS[labelId].color} size={6} />
                  <Typography component="span" sx={{ fontSize: "0.7rem", fontWeight: 600, color: INBOX_COLORS.text }}>
                    {LABELS[labelId].label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </ButtonBase>

      <Stack sx={{ alignItems: "center", pt: 0.8, flexShrink: 0 }}>
        <Tooltip title={thread.isStarred ? "Unstar" : "Star"}>
          <IconButton
            size="small"
            aria-label={thread.isStarred ? `Unstar "${subject}"` : `Star "${subject}"`}
            aria-pressed={thread.isStarred}
            onClick={() => onToggleStar(thread.threadId, !thread.isStarred)}
            sx={{ color: thread.isStarred ? "#f5b400" : "#9bb7c9" }}
          >
            {thread.isStarred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
        {thread.hasAttachments && (
          <Tooltip title="Has attachments">
            <AttachFile
              aria-label="Has attachments"
              role="img"
              sx={{ fontSize: 17, color: INBOX_COLORS.muted, transform: "rotate(45deg)", mt: 0.3 }}
            />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}
