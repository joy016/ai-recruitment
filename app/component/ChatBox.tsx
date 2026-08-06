"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CloseRounded,
  SendRounded,
  SmartToyOutlined,
} from "@mui/icons-material";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
};

type SendResponse = string | ChatMessage | void;

type ChatBoxProps = {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  height?: number | string;
  width?: number | string;
  disabled?: boolean;
  loading?: boolean;
  emptyStateText?: string;
  floating?: boolean;
  defaultOpen?: boolean;
  rightOffset?: number;
  bottomOffset?: number;
  messages?: ChatMessage[];
  initialMessages?: ChatMessage[];
  onSendMessage?: (
    prompt: string,
    allMessages: ChatMessage[],
  ) => Promise<SendResponse> | SendResponse;
};

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function ChatBox({
  title = "AI Recruiter Assistant",
  subtitle = "Ask for candidate insights, interview questions, or job post suggestions.",
  placeholder = "Ask something...",
  height = 460,
  width = 380,
  disabled = false,
  loading = false,
  emptyStateText = "Start by asking the assistant a recruitment-related question.",
  floating = true,
  defaultOpen = false,
  rightOffset = 24,
  bottomOffset = 24,
  messages,
  initialMessages = [],
  onSendMessage,
}: ChatBoxProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] =
    useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageList = messages ?? localMessages;
  const isControlled = typeof messages !== "undefined";
  const isBusy = loading || isSending;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messageList, isBusy]);

  const canSend = useMemo(
    () => !disabled && !isBusy && draft.trim().length > 0,
    [disabled, isBusy, draft],
  );

  const appendLocalMessage = (message: ChatMessage) => {
    if (isControlled) {
      return;
    }

    setLocalMessages((current) => [...current, message]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = draft.trim();
    if (!prompt || disabled || isBusy) {
      return;
    }

    setErrorMessage(null);
    setDraft("");

    const userMessage = createMessage("user", prompt);
    const nextMessages = [...messageList, userMessage];
    appendLocalMessage(userMessage);

    if (!onSendMessage) {
      return;
    }

    setIsSending(true);

    try {
      const response = await onSendMessage(prompt, nextMessages);

      if (!response) {
        return;
      }

      if (typeof response === "string") {
        appendLocalMessage(createMessage("assistant", response));
        return;
      }

      appendLocalMessage({
        ...response,
        id: response.id || createMessage("assistant", response.content).id,
      });
    } catch {
      setErrorMessage("Message failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const chatContent = (
    <Paper
      elevation={8}
      sx={{
        border: "1px solid #d7e8f5",
        borderRadius: 3,
        bgcolor: "#ffffff",
        height: isMobile ? "min(70vh, 540px)" : height,
        width: isMobile ? "calc(100vw - 16px)" : width,
        maxWidth: isMobile ? "calc(100vw - 16px)" : "calc(100vw - 24px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 14px 32px rgba(18, 73, 109, 0.18)",
      }}
    >
      <Stack
        direction="row"
        spacing={1.2}
        component="header"
        sx={{ p: { xs: 1.5, sm: 2 } }}
      >
        <Stack direction="row" spacing={1.2}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: "#e8f5ff",
              color: "#1f80b6",
              display: "grid",
              placeItems: "center",
            }}
          >
            <SmartToyOutlined fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant={isMobile ? "subtitle1" : "h6"}
              sx={{ color: "#17456a", fontWeight: 700, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#527892", display: { xs: "none", sm: "block" } }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Stack>

        {floating ? (
          <IconButton
            aria-label="Close chat"
            onClick={() => setIsOpen(false)}
            sx={{ color: "#6f8ba0" }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>

      <Divider />

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: 2,
          py: 1.5,
          bgcolor: "#f9fcff",
        }}
      >
        {messageList.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              px: 3,
            }}
          >
            <Typography variant="body2" sx={{ color: "#6a8ba3" }}>
              {emptyStateText}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.2}>
            {messageList.map((message) => {
              const isUser = message.role === "user";

              return (
                <Box
                  key={message.id}
                  sx={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    px: 1.4,
                    py: 1,
                    borderRadius: 2,
                    border: isUser ? "1px solid #96c9e6" : "1px solid #d8eaf7",
                    bgcolor: isUser ? "#dff1fb" : "#ffffff",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "#5e7b90", fontWeight: 700 }}
                  >
                    {isUser ? "You" : "Assistant"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#1c3342",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {message.content}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      <Divider />

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled || isBusy}
            placeholder={placeholder}
            fullWidth
            multiline
            maxRows={4}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f9fcff",
              },
            }}
          />
          <IconButton
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: canSend ? "#1f80b6" : "#dce9f2",
              color: canSend ? "#ffffff" : "#88a5b9",
              "&:hover": {
                bgcolor: canSend ? "#176992" : "#dce9f2",
              },
            }}
          >
            {isBusy ? (
              <CircularProgress size={18} sx={{ color: "#ffffff" }} />
            ) : (
              <SendRounded fontSize="small" />
            )}
          </IconButton>
        </Stack>

        {errorMessage ? (
          <Alert severity="error" sx={{ mt: 1.2, borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
      </Box>
    </Paper>
  );

  if (!floating) {
    return chatContent;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        right: isMobile ? 8 : rightOffset,
        bottom: isMobile ? 8 : bottomOffset,
        zIndex: 1400,
      }}
    >
      {isOpen ? (
        <Box
          sx={{
            transformOrigin: "bottom right",
            animation: "chatOpen 180ms ease-out",
            "@keyframes chatOpen": {
              "0%": {
                opacity: 0,
                transform: "translateY(10px) scale(0.98)",
              },
              "100%": {
                opacity: 1,
                transform: "translateY(0) scale(1)",
              },
            },
          }}
        >
          {chatContent}
        </Box>
      ) : (
        <Fab
          color="primary"
          variant={isMobile ? "circular" : "extended"}
          aria-label="Open AI chat"
          onClick={() => setIsOpen(true)}
          sx={{
            textTransform: "none",
            gap: 1,
            px: isMobile ? 0 : 2.2,
            borderRadius: 99,
            bgcolor: "#1f80b6",
            color: "#ffffff",
            boxShadow: "0 10px 22px rgba(14, 59, 88, 0.24)",
            "&:hover": {
              bgcolor: "#176992",
            },
          }}
        >
          <SmartToyOutlined fontSize="small" />
          {!isMobile ? "Chat AI" : null}
        </Fab>
      )}
    </Box>
  );
}
