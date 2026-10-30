"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { MailOutlined } from "@mui/icons-material";
import {
  MOCK_THREADS,
  MOCK_UNREAD_INBOX_COUNT,
} from "@/app/(dashboard)/hr/inbox/(constants)/mockInbox";
import {
  formatListTime,
  getAvatarColor,
  getCounterpart,
  getInitials,
  getLatestMessage,
  getPreview,
} from "@/app/(dashboard)/hr/inbox/(utils)/inbox.utils";

const PREVIEW_LIMIT = 4;

/**
 * Header dropdown previewing new inbox messages. DESIGN-ONLY: reads the
 * mock threads. TODO(wire-up): fetch unread threads from the mail API.
 * Kept separate from the bell, which shows real system notifications.
 */
export default function InboxPreviewMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const unread = MOCK_THREADS.filter((thread) => thread.folder === "inbox" && thread.isUnread)
    .sort((a, b) => getLatestMessage(b).sentAt.localeCompare(getLatestMessage(a).sentAt))
    .slice(0, PREVIEW_LIMIT);

  return (
    <>
      <Tooltip title="Messages">
        <IconButton
          aria-label={
            MOCK_UNREAD_INBOX_COUNT > 0
              ? `Open messages preview, ${MOCK_UNREAD_INBOX_COUNT} unread`
              : "Open messages preview"
          }
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            color: "#1f80b6",
            bgcolor: "#ecf7ff",
            border: "1px solid #d3e8f5",
            "&:hover": { bgcolor: "#e2f1fb" },
          }}
        >
          <Badge color="error" badgeContent={MOCK_UNREAD_INBOX_COUNT} max={99}>
            <MailOutlined />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 360,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 3,
              border: "1px solid #d7e8f5",
              boxShadow: "0 12px 32px rgba(15, 58, 92, 0.16)",
            },
          },
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center", px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: "#17456a", flex: 1 }}>New messages</Typography>
          {MOCK_UNREAD_INBOX_COUNT > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#1f80b6" }}>
              {MOCK_UNREAD_INBOX_COUNT} unread
            </Typography>
          )}
        </Stack>
        <Divider sx={{ borderColor: "#e1eef7" }} />

        {unread.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#5f7f96", textAlign: "center", py: 4 }}>
            You&apos;re all caught up.
          </Typography>
        ) : (
          <List disablePadding>
            {unread.map((thread) => {
              const sender = getCounterpart(thread);
              const latest = getLatestMessage(thread);
              return (
                <ListItemButton
                  key={thread.id}
                  component={Link}
                  href="/hr/inbox"
                  onClick={() => setAnchorEl(null)}
                  sx={{ alignItems: "flex-start", gap: 1.3, py: 1.2, borderBottom: "1px solid #eef5fb" }}
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      bgcolor: getAvatarColor(sender.email),
                    }}
                  >
                    {getInitials(sender.name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1}>
                      <Typography noWrap sx={{ flex: 1, fontSize: "0.88rem", fontWeight: 700, color: "#17456a" }}>
                        {sender.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#1f80b6", fontWeight: 600 }}>
                        {formatListTime(latest.sentAt)}
                      </Typography>
                    </Stack>
                    <Typography noWrap sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#264a66" }}>
                      {thread.subject}
                    </Typography>
                    <Typography noWrap variant="caption" sx={{ display: "block", color: "#5f7f96" }}>
                      {getPreview(latest)}
                    </Typography>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}

        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            component={Link}
            href="/hr/inbox"
            onClick={() => setAnchorEl(null)}
            sx={{ textTransform: "none", fontWeight: 700, color: "#1f80b6", borderRadius: 2 }}
          >
            Open Inbox
          </Button>
        </Box>
      </Popover>
    </>
  );
}
