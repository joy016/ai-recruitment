"use client";

import { useId, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  createFilterOptions,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AttachFile,
  AutoAwesome,
  Close,
  CloseFullscreen,
  DeleteOutlined,
  DescriptionOutlined,
  ExpandMore,
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatUnderlined,
  InsertLink,
  Minimize,
  OpenInFull,
  Send,
} from "@mui/icons-material";
import {
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_IDS,
  INBOX_COLORS,
  MOCK_AI_DELAY_MS,
  MOCK_AI_DRAFT,
  type EmailTemplateId,
} from "../(constants)/inbox.constants";
import { MOCK_CANDIDATES } from "../(constants)/mockInbox";
import type { ComposeDraft } from "../(types)/inbox.types";
import { fillName, getFirstName } from "../(utils)/inbox.utils";

type ComposeDialogProps = {
  open: boolean;
  /** Read once on mount; remount (change `key`) to start a new draft. */
  initialDraft: ComposeDraft;
  title?: string;
  onClose: () => void;
  onSend: (draft: ComposeDraft) => void;
  onSaveDraft: (draft: ComposeDraft) => void;
  onNotify: (message: string) => void;
};

type RecipientField = "to" | "cc" | "bcc";

const CANDIDATE_EMAILS = MOCK_CANDIDATES.map((candidate) => candidate.email);
const nameByEmail = new Map(MOCK_CANDIDATES.map((candidate) => [candidate.email, candidate.name]));
// Lets "oliv" match "Oliver Santos <oliver.santos@…>".
const filterRecipients = createFilterOptions<string>({
  stringify: (email) => `${nameByEmail.get(email) ?? ""} ${email}`,
});

const toolbarButtonSx = {
  border: "none",
  borderRadius: "8px !important",
  color: INBOX_COLORS.muted,
  "&.Mui-selected": { color: INBOX_COLORS.primary, bgcolor: INBOX_COLORS.selected },
} as const;

/**
 * Compose window: a floating panel at the bottom right that can expand to a
 * full dialog (always full screen on phones). DESIGN-ONLY: Send / Save Draft
 * only report back to the page; nothing is sent.
 */
export default function ComposeDialog({
  open,
  initialDraft,
  title = "New Message",
  onClose,
  onSend,
  onSaveDraft,
  onNotify,
}: Readonly<ComposeDialogProps>) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ComposeDraft>(initialDraft);
  const [showCc, setShowCc] = useState(initialDraft.cc.length > 0);
  const [showBcc, setShowBcc] = useState(initialDraft.bcc.length > 0);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [formats, setFormats] = useState<string[]>([]);
  const [templateAnchor, setTemplateAnchor] = useState<HTMLElement | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  const update = <K extends keyof ComposeDraft>(field: K, value: ComposeDraft[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const firstName = draft.to[0] ? getFirstName(draft.to[0]) : "";

  const applyTemplate = (id: EmailTemplateId) => {
    const template = EMAIL_TEMPLATES[id];
    setDraft((current) => ({
      ...current,
      subject: template.subject,
      body: fillName(template.body, firstName),
    }));
    setTemplateAnchor(null);
  };

  // TODO(wire-up): call the AI drafting endpoint.
  const writeWithAi = () => {
    setIsWriting(true);
    setTimeout(() => {
      update("body", fillName(MOCK_AI_DRAFT, firstName));
      setIsWriting(false);
    }, MOCK_AI_DELAY_MS);
  };

  const isFullDialog = expanded || isPhone;
  const canSend = draft.to.length > 0 && !isWriting;

  const renderRecipientField = (field: RecipientField, label: string, trailing?: React.ReactNode) => (
    <Stack
      direction="row"
      sx={{ alignItems: "center", px: 2, minHeight: 44, borderBottom: `1px solid ${INBOX_COLORS.divider}` }}
    >
      <Typography component="label" htmlFor={`${titleId}-${field}`} sx={{ width: 36, fontSize: "0.85rem", color: INBOX_COLORS.muted }}>
        {label}
      </Typography>
      <Autocomplete
        multiple
        freeSolo
        id={`${titleId}-${field}`}
        size="small"
        options={CANDIDATE_EMAILS}
        filterOptions={filterRecipients}
        value={draft[field]}
        onChange={(_, value) => update(field, value)}
        sx={{ flex: 1, minWidth: 0 }}
        renderOption={(props, email) => {
          const { key, ...optionProps } = props;
          return (
            <li key={key} {...optionProps}>
              <ListItemText
                primary={nameByEmail.get(email) ?? email}
                secondary={email}
                slotProps={{ primary: { sx: { fontSize: "0.88rem", fontWeight: 600 } } }}
              />
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            placeholder={draft[field].length === 0 ? "Name or email" : undefined}
            slotProps={{
              ...params.slotProps,
              input: { ...params.slotProps.input, disableUnderline: true, sx: { fontSize: "0.88rem" } },
            }}
          />
        )}
      />
      {trailing}
    </Stack>
  );

  const header = (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        pl: 2,
        pr: 0.5,
        minHeight: 48,
        color: "#ffffff",
        background: "linear-gradient(110deg, #0f3a5c 0%, #1a5f95 70%, #2f7fd0 100%)",
        cursor: !isFullDialog && minimized ? "pointer" : undefined,
      }}
      onClick={!isFullDialog && minimized ? () => setMinimized(false) : undefined}
    >
      <Typography id={titleId} component="h2" noWrap sx={{ flex: 1, fontWeight: 700, fontSize: "0.95rem" }}>
        {draft.subject.trim() || title}
      </Typography>
      {!isPhone && (
        <>
          {!isFullDialog && (
            <Tooltip title={minimized ? "Restore" : "Minimize"}>
              <IconButton
                size="small"
                aria-label={minimized ? "Restore compose window" : "Minimize compose window"}
                onClick={(event) => {
                  event.stopPropagation();
                  setMinimized((value) => !value);
                }}
                sx={{ color: "inherit" }}
              >
                <Minimize fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={expanded ? "Exit full screen" : "Full screen"}>
            <IconButton
              size="small"
              aria-label={expanded ? "Exit full screen" : "Expand to full screen"}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((value) => !value);
                setMinimized(false);
              }}
              sx={{ color: "inherit" }}
            >
              {expanded ? <CloseFullscreen fontSize="small" /> : <OpenInFull fontSize="small" />}
            </IconButton>
          </Tooltip>
        </>
      )}
      <Tooltip title="Close">
        <IconButton
          size="small"
          aria-label="Close compose window"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          sx={{ color: "inherit" }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const ccBccToggles = (
    <Stack direction="row" spacing={0.3}>
      {!showCc && (
        <Button size="small" onClick={() => setShowCc(true)} sx={{ minWidth: 0, textTransform: "none", color: INBOX_COLORS.muted }}>
          Cc
        </Button>
      )}
      {!showBcc && (
        <Button size="small" onClick={() => setShowBcc(true)} sx={{ minWidth: 0, textTransform: "none", color: INBOX_COLORS.muted }}>
          Bcc
        </Button>
      )}
    </Stack>
  );

  const form = (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {renderRecipientField("to", "To", ccBccToggles)}
      {showCc && renderRecipientField("cc", "Cc")}
      {showBcc && renderRecipientField("bcc", "Bcc")}
      <Box sx={{ px: 2, borderBottom: `1px solid ${INBOX_COLORS.divider}` }}>
        <TextField
          fullWidth
          variant="standard"
          placeholder="Subject"
          value={draft.subject}
          onChange={(event) => update("subject", event.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Subject" },
            input: { disableUnderline: true, sx: { fontSize: "0.9rem", py: 1 } },
          }}
        />
      </Box>

      {/* Formatting toolbar (visual only for now). */}
      <Stack
        direction="row"
        role="toolbar"
        aria-label="Text formatting"
        sx={{ alignItems: "center", px: 1, py: 0.5, gap: 0.5, borderBottom: `1px solid ${INBOX_COLORS.divider}`, flexWrap: "wrap" }}
      >
        <ToggleButtonGroup size="small" value={formats} onChange={(_, value: string[]) => setFormats(value)}>
          <ToggleButton value="bold" aria-label="Bold" sx={toolbarButtonSx}><FormatBold fontSize="small" /></ToggleButton>
          <ToggleButton value="italic" aria-label="Italic" sx={toolbarButtonSx}><FormatItalic fontSize="small" /></ToggleButton>
          <ToggleButton value="underline" aria-label="Underline" sx={toolbarButtonSx}><FormatUnderlined fontSize="small" /></ToggleButton>
          <ToggleButton value="bulleted" aria-label="Bulleted list" sx={toolbarButtonSx}><FormatListBulleted fontSize="small" /></ToggleButton>
          <ToggleButton value="numbered" aria-label="Numbered list" sx={toolbarButtonSx}><FormatListNumbered fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="Insert link">
          <IconButton size="small" aria-label="Insert link" onClick={() => onNotify("Links aren't available yet.")} sx={{ color: INBOX_COLORS.muted, borderRadius: 2 }}>
            <InsertLink fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 160, overflowY: "auto", px: 2, py: 1.5 }}>
        <TextField
          fullWidth
          multiline
          minRows={isFullDialog ? 14 : 8}
          variant="standard"
          placeholder="Write your message…"
          value={draft.body}
          disabled={isWriting}
          onChange={(event) => update("body", event.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Message body" },
            input: {
              disableUnderline: true,
              sx: {
                fontSize: "0.92rem",
                lineHeight: 1.7,
                fontWeight: formats.includes("bold") ? 700 : 400,
                fontStyle: formats.includes("italic") ? "italic" : "normal",
                textDecoration: formats.includes("underline") ? "underline" : "none",
              },
            },
          }}
        />
        {files.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.8, mt: 1 }}>
            {files.map((name) => (
              <Chip
                key={name}
                size="small"
                icon={<AttachFile sx={{ transform: "rotate(45deg)" }} />}
                label={name}
                onDelete={() => setFiles((current) => current.filter((file) => file !== name))}
                sx={{ bgcolor: INBOX_COLORS.selected, color: INBOX_COLORS.text, fontWeight: 600 }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ borderColor: INBOX_COLORS.divider }} />
      {/* On phones, keep the corner free for the global "Chat AI" button. */}
      <Stack direction="row" sx={{ alignItems: "center", p: 1.2, pr: { xs: 9, sm: 1.2 }, gap: 0.8, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          endIcon={<Send />}
          disabled={!canSend}
          onClick={() => onSend(draft)}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2.5, bgcolor: INBOX_COLORS.primary, boxShadow: "none" }}
        >
          Send
        </Button>
        <Tooltip title="Attach file">
          <IconButton aria-label="Attach file" onClick={() => fileInputRef.current?.click()} sx={{ color: INBOX_COLORS.muted }}>
            <AttachFile sx={{ transform: "rotate(45deg)" }} />
          </IconButton>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            const names = Array.from(event.target.files ?? [], (file) => file.name);
            setFiles((current) => [...new Set([...current, ...names])]);
            event.target.value = "";
          }}
        />
        <Button
          size="small"
          startIcon={<DescriptionOutlined />}
          endIcon={<ExpandMore />}
          aria-haspopup="menu"
          aria-expanded={Boolean(templateAnchor)}
          onClick={(event) => setTemplateAnchor(event.currentTarget)}
          sx={{ textTransform: "none", fontWeight: 600, color: INBOX_COLORS.text }}
        >
          Use Template
        </Button>
        <Menu anchorEl={templateAnchor} open={Boolean(templateAnchor)} onClose={() => setTemplateAnchor(null)}>
          {EMAIL_TEMPLATE_IDS.map((id) => (
            <MenuItem key={id} onClick={() => applyTemplate(id)} sx={{ fontSize: "0.9rem" }}>
              {EMAIL_TEMPLATES[id].label}
            </MenuItem>
          ))}
        </Menu>
        <Button
          size="small"
          onClick={writeWithAi}
          disabled={isWriting}
          startIcon={isWriting ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
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
          {isWriting ? "Writing…" : "Write with AI"}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={() => onSaveDraft(draft)} sx={{ textTransform: "none", fontWeight: 600, color: INBOX_COLORS.primary }}>
          Save Draft
        </Button>
        <Tooltip title="Discard">
          <IconButton aria-label="Discard draft" onClick={onClose} sx={{ color: INBOX_COLORS.muted }}>
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );

  if (isFullDialog) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        fullScreen={isPhone}
        aria-labelledby={titleId}
        slotProps={{
          paper: {
            sx: {
              borderRadius: isPhone ? 0 : 3,
              // ≥ 88px top/bottom so the centred dialog clears the Chat AI button.
              height: isPhone ? "100%" : "min(760px, calc(100vh - 176px))",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            },
          },
        }}
      >
        {header}
        {form}
      </Dialog>
    );
  }

  if (!open) return null;

  return (
    <Paper
      role="dialog"
      aria-labelledby={titleId}
      elevation={0}
      onKeyDown={(event) => {
        if (event.key === "Escape") setMinimized(true);
      }}
      sx={{
        position: "fixed",
        right: { sm: 16, md: 24 },
        // Sits above the global "Chat AI" button (bottom 24px, 48px tall).
        bottom: 88,
        zIndex: theme.zIndex.drawer + 2,
        width: minimized ? 300 : 540,
        height: minimized ? 48 : "min(600px, calc(100vh - 176px))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 3,
        border: `1px solid ${INBOX_COLORS.border}`,
        boxShadow: "0 12px 40px rgba(15, 58, 92, 0.25)",
        transition: "height 160ms ease, width 160ms ease",
      }}
    >
      {header}
      {!minimized && form}
    </Paper>
  );
}
