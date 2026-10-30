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
import { INBOX_COLORS } from "../(constants)/inbox.constants";
import type { InboxThread } from "../(types)/inbox.types";
import {
  formatListTime,
  getAvatarColor,
  getCounterpart,
  getInitials,
  getLatestMessage,
  getPreview,
  getThreadCandidate,
  threadHasAttachments,
} from "../(utils)/inbox.utils";
import CandidateStatusChip from "./CandidateStatusChip";

type MessageListItemProps = {
  thread: InboxThread;
  selected: boolean;
  checked: boolean;
  /** Sent and Drafts show the recipient instead of the sender. */
  showRecipient: boolean;
  onOpen: (threadId: string) => void;
  onToggleCheck: (threadId: string) => void;
  onToggleStar: (threadId: string) => void;
};

export default function MessageListItem({
  thread,
  selected,
  checked,
  showRecipient,
  onOpen,
  onToggleCheck,
  onToggleStar,
}: Readonly<MessageListItemProps>) {
  const latest = getLatestMessage(thread);
  const counterpart = showRecipient ? (latest.to[0] ?? latest.from) : getCounterpart(thread);
  const candidate = getThreadCandidate(thread);
  const hasAttachments = threadHasAttachments(thread);
  const isDraft = thread.folder === "drafts";
  const unread = thread.isUnread;
  const count = thread.messages.length;

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
        onChange={() => onToggleCheck(thread.id)}
        slotProps={{ input: { "aria-label": `Select "${thread.subject}"` } }}
        sx={{ mt: 1.3, color: "#9bb7c9" }}
      />

      <ButtonBase
        onClick={() => onOpen(thread.id)}
        aria-current={selected ? "true" : undefined}
        aria-label={`${unread ? "Unread. " : ""}${counterpart.name}: ${thread.subject}`}
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
              bgcolor: getAvatarColor(counterpart.email),
            }}
          >
            {getInitials(counterpart.name)}
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
              {showRecipient ? `To: ${counterpart.name}` : counterpart.name}
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
              {formatListTime(latest.sentAt)}
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
            {thread.subject}
          </Typography>

          <Typography noWrap variant="body2" sx={{ color: INBOX_COLORS.muted, fontSize: "0.82rem" }}>
            {getPreview(latest)}
          </Typography>

          {candidate && (
            <Box sx={{ mt: 0.7 }}>
              <CandidateStatusChip status={candidate.status} compact />
            </Box>
          )}
        </Box>
      </ButtonBase>

      <Stack sx={{ alignItems: "center", pt: 0.8, flexShrink: 0 }}>
        <Tooltip title={thread.isStarred ? "Unstar" : "Star"}>
          <IconButton
            size="small"
            aria-label={thread.isStarred ? `Unstar "${thread.subject}"` : `Star "${thread.subject}"`}
            aria-pressed={thread.isStarred}
            onClick={() => onToggleStar(thread.id)}
            sx={{ color: thread.isStarred ? "#f5b400" : "#9bb7c9" }}
          >
            {thread.isStarred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
        {hasAttachments && (
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
