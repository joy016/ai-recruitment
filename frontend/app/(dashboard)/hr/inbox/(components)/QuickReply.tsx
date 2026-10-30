"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { AutoAwesome, OpenInFull, Send } from "@mui/icons-material";
import {
  INBOX_COLORS,
  MOCK_AI_DELAY_MS,
  MOCK_AI_REPLY,
} from "../(constants)/inbox.constants";
import { fillName } from "../(utils)/inbox.utils";

type QuickReplyProps = {
  recipientName: string;
  recipientFirstName: string;
  onSend: (body: string) => void;
  /** Opens the full composer with the current text. */
  onExpand: (body: string) => void;
};

export default function QuickReply({
  recipientName,
  recipientFirstName,
  onSend,
  onExpand,
}: Readonly<QuickReplyProps>) {
  const [body, setBody] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);

  // DESIGN-ONLY: canned text after a short delay.
  // TODO(wire-up): call the AI reply endpoint with the thread context.
  const suggestReply = () => {
    setIsSuggesting(true);
    setTimeout(() => {
      setBody(fillName(MOCK_AI_REPLY, recipientFirstName));
      setIsSuggesting(false);
    }, MOCK_AI_DELAY_MS);
  };

  const send = () => {
    onSend(body);
    setBody("");
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: `1px solid ${INBOX_COLORS.divider}`,
        bgcolor: "#fbfdff",
      }}
    >
      <Box
        sx={{
          borderRadius: 3,
          border: `1px solid ${INBOX_COLORS.border}`,
          bgcolor: "#ffffff",
          transition: "border-color 120ms, box-shadow 120ms",
          "&:focus-within": {
            borderColor: INBOX_COLORS.primary,
            boxShadow: "0 0 0 3px rgba(31, 128, 182, 0.12)",
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          placeholder={`Reply to ${recipientName}…`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={isSuggesting}
          variant="standard"
          slotProps={{
            htmlInput: { "aria-label": `Quick reply to ${recipientName}` },
            input: { disableUnderline: true, sx: { px: 1.5, pt: 1.2, fontSize: "0.9rem" } },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", p: 1 }}>
          <Button
            size="small"
            onClick={suggestReply}
            disabled={isSuggesting}
            startIcon={
              isSuggesting ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 999,
              px: 1.5,
              color: "#6d28d9",
              bgcolor: "#f3eeff",
              "&:hover": { bgcolor: "#e9e0ff" },
            }}
          >
            {isSuggesting ? "Writing…" : "AI Suggest Reply"}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Open in full composer">
            <IconButton
              size="small"
              aria-label="Open reply in full composer"
              onClick={() => onExpand(body)}
              sx={{ color: INBOX_COLORS.muted }}
            >
              <OpenInFull fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            endIcon={<Send />}
            onClick={send}
            disabled={!body.trim() || isSuggesting}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: INBOX_COLORS.primary,
              boxShadow: "none",
            }}
          >
            Send
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
