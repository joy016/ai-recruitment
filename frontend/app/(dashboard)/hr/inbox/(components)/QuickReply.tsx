"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { AutoAwesome, OpenInFull, Send } from "@mui/icons-material";
import { useInboxToast } from "@/app/component/InboxEventsProvider";
import { aiSuggestReply } from "@/lib/api/inbox";
import { INBOX_COLORS } from "../(constants)/inbox.constants";

const MAX_SUGGESTIONS = 3;

type QuickReplyProps = {
  threadId: string;
  recipientName: string;
  isSending: boolean;
  /** Resolves true once the reply is queued, which clears the box. */
  onSend: (body: string) => Promise<boolean>;
  /** Opens the full composer with the current text. */
  onExpand: (body: string) => void;
};

export default function QuickReply({
  threadId,
  recipientName,
  isSending,
  onSend,
  onExpand,
}: Readonly<QuickReplyProps>) {
  const { notify } = useInboxToast();
  const [body, setBody] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // AI text only fills the box; HR reviews it and presses Send.
  const suggestReply = async () => {
    setIsSuggesting(true);
    try {
      const response = await aiSuggestReply(threadId);
      const options = response.suggestions.map((text) => text.trim()).filter(Boolean).slice(0, MAX_SUGGESTIONS);
      if (options.length === 0) {
        notify("No suggestions available for this conversation.");
        return;
      }
      setBody(options[0]);
      setSuggestions(options.length > 1 ? options : []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Couldn't get a suggestion.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const send = async () => {
    if (await onSend(body)) {
      setBody("");
      setSuggestions([]);
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: `1px solid ${INBOX_COLORS.divider}`,
        bgcolor: "#fbfdff",
      }}
    >
      {suggestions.length > 0 && (
        <Stack
          direction="row"
          role="group"
          aria-label="AI suggestions"
          spacing={0.8}
          sx={{ mb: 1, overflowX: "auto", scrollbarWidth: "none" }}
        >
          {suggestions.map((suggestion, index) => (
            <Chip
              key={suggestion}
              size="small"
              icon={<AutoAwesome sx={{ fontSize: "14px !important" }} />}
              label={`Suggestion ${index + 1}`}
              title={suggestion}
              clickable
              aria-pressed={body === suggestion}
              onClick={() => setBody(suggestion)}
              sx={{
                flexShrink: 0,
                fontWeight: 600,
                color: "#6d28d9",
                bgcolor: body === suggestion ? "#e9e0ff" : "#f3eeff",
              }}
            />
          ))}
        </Stack>
      )}
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
          disabled={isSuggesting || isSending}
          variant="standard"
          slotProps={{
            htmlInput: { "aria-label": `Quick reply to ${recipientName}` },
            input: { disableUnderline: true, sx: { px: 1.5, pt: 1.2, fontSize: "0.9rem" } },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", p: 1 }}>
          <Button
            size="small"
            onClick={() => void suggestReply()}
            disabled={isSuggesting || isSending}
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
            endIcon={isSending ? <CircularProgress size={14} color="inherit" /> : <Send />}
            onClick={() => void send()}
            disabled={!body.trim() || isSuggesting || isSending}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: INBOX_COLORS.primary,
              boxShadow: "none",
            }}
          >
            {isSending ? "Sending…" : "Send"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
