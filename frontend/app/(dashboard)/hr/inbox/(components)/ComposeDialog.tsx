"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Skeleton,
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
  ErrorOutlined,
  ExpandMore,
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatUnderlined,
  Minimize,
  OpenInFull,
  Send,
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import { useInboxToast } from "@/app/component/InboxEventsProvider";
import {
  aiWrite,
  createDraft,
  deleteDraft,
  renderTemplate,
  updateDraft,
  uploadAttachment,
  toInboxError,
} from "@/lib/api/inbox";
import { invalidateInbox, useEmailTemplates, useSendEmail } from "@/lib/hooks/useInbox";
import type { EmailTemplate, InboxAttachment, SaveDraftPayload } from "@/lib/types/inbox";
import { htmlToText, textToHtml } from "@/lib/utils/emailHtml";
import {
  AI_TONES,
  DRAFT_AUTOSAVE_MS,
  INBOX_COLORS,
  MAX_ATTACHMENT_BYTES,
} from "../(constants)/inbox.constants";
import type { ComposeDraft, ComposeInit, KnownRecipient } from "../(types)/inbox.types";
import {
  formatFileSize,
  getAttachmentError,
  isValidEmail,
  validateOutgoing,
} from "../(utils)/inbox.utils";

type ComposeDialogProps = {
  /** Read once on mount; remount (change `key`) to start a new message. */
  init: ComposeInit;
  /** Candidate emails seen in the Inbox, for recipient suggestions. */
  knownRecipients: KnownRecipient[];
  onClose: () => void;
};

type RecipientField = "to" | "cc" | "bcc";
type TextDraft = Omit<ComposeDraft, "attachments">;

type Upload = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
  attachment?: InboxAttachment;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
};

const toolbarButtonSx = {
  border: "none",
  borderRadius: "8px !important",
  color: INBOX_COLORS.muted,
  "&.Mui-selected": { color: INBOX_COLORS.primary, bgcolor: INBOX_COLORS.selected },
} as const;

const fromAttachment = (attachment: InboxAttachment): Upload => ({
  key: attachment.id,
  name: attachment.filename,
  size: attachment.size,
  status: "done",
  progress: 100,
  attachment,
});

/**
 * Compose / Reply / Reply all / Forward: a floating panel at the bottom right
 * that can expand to a full dialog (always full screen on phones). Drafts
 * autosave; sending is queued by the API and confirmed over SSE.
 */
export default function ComposeDialog({ init, knownRecipients, onClose }: Readonly<ComposeDialogProps>) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { notify } = useInboxToast();
  const { send, isSending, resetAttempt } = useSendEmail();
  const templatesQuery = useEmailTemplates();

  const [draft, setDraft] = useState<TextDraft>(() => ({
    to: init.draft.to,
    cc: init.draft.cc,
    bcc: init.draft.bcc,
    subject: init.draft.subject,
    body: init.draft.body,
  }));
  const [uploads, setUploads] = useState<Upload[]>(() => init.draft.attachments.map(fromAttachment));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(init.draft.cc.length > 0);
  const [showBcc, setShowBcc] = useState(init.draft.bcc.length > 0);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [formats, setFormats] = useState<string[]>([]);
  const [templateAnchor, setTemplateAnchor] = useState<HTMLElement | null>(null);
  const [aiAnchor, setAiAnchor] = useState<HTMLElement | null>(null);
  const [aiTone, setAiTone] = useState<string>(AI_TONES[0]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  // Edits vs. what the last successful draft save covered.
  const [version, setVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const draftIdRef = useRef<string | null>(init.draftId ?? null);
  const savingRef = useRef<Promise<boolean> | null>(null);
  // Set while sending or after closing, so autosave stops writing.
  const doneRef = useRef(false);
  const uploadControllersRef = useRef(new Map<string, AbortController>());

  const nameByEmail = new Map(knownRecipients.map((item) => [item.email.toLowerCase(), item.name]));
  const filterRecipients = createFilterOptions<string>({
    stringify: (email) => `${nameByEmail.get(email.toLowerCase()) ?? ""} ${email}`,
  });
  const recipientOptions = knownRecipients.map((item) => item.email);

  const attachmentBytes = uploads.reduce((sum, item) => (item.status === "error" ? sum : sum + item.size), 0);
  const isUploading = uploads.some((item) => item.status === "uploading");
  const errors = validateOutgoing(draft, attachmentBytes);
  const isValid = Object.keys(errors).length === 0;
  const hasContent =
    draft.to.length + draft.cc.length + draft.bcc.length > 0 ||
    draft.subject.trim() !== "" ||
    draft.body.trim() !== "" ||
    uploads.length > 0;
  const isDirty = version !== savedVersion;
  const isBusy = isSending || isWriting || isApplyingTemplate;

  const markEdited = () => {
    setVersion((current) => current + 1);
    resetAttempt(); // changed content = a new send attempt
  };

  const update = <K extends keyof TextDraft>(field: K, value: TextDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    markEdited();
  };

  const touch = (field: string) => setTouched((current) => new Set(current).add(field));
  const errorFor = (field: keyof typeof errors) => (touched.has(field) ? errors[field] : undefined);

  const buildPayload = (): SaveDraftPayload => ({
    to: draft.to,
    cc: draft.cc,
    bcc: draft.bcc,
    subject: draft.subject.trim(),
    bodyHtml: draft.body.trim() ? textToHtml(draft.body) : "",
    attachmentIds: uploads.flatMap((item) => (item.attachment ? [item.attachment.id] : [])),
    replyToMessageId: init.replyToMessageId ?? null,
    templateId,
  });

  /** Creates the draft the first time, updates it after. */
  const saveDraft = async (): Promise<boolean> => {
    // Nothing worth keeping yet: don't create an empty draft.
    if (doneRef.current || (!hasContent && !draftIdRef.current)) return false;
    if (savingRef.current) await savingRef.current;
    const coveredVersion = version;
    const payload = buildPayload();
    const request = (async () => {
      setSaveState("saving");
      try {
        const saved = draftIdRef.current
          ? await updateDraft(draftIdRef.current, payload)
          : await createDraft(payload);
        draftIdRef.current = saved.id;
        setSavedVersion(coveredVersion);
        setSaveState("saved");
        invalidateInbox(queryClient);
        return true;
      } catch {
        setSaveState("error");
        return false;
      } finally {
        savingRef.current = null;
      }
    })();
    savingRef.current = request;
    return request;
  };

  // Autosave ~2s after typing stops. The ref gives the timer the latest draft.
  const saveRef = useRef(saveDraft);
  useEffect(() => {
    saveRef.current = saveDraft;
  });
  useEffect(() => {
    if (version === 0) return;
    const timer = setTimeout(() => void saveRef.current(), DRAFT_AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [version]);

  // Cancel uploads still running when the composer goes away.
  useEffect(() => {
    const controllers = uploadControllersRef.current;
    return () => controllers.forEach((controller) => controller.abort());
  }, []);

  const recipientNameFor = () => (draft.to[0] ? nameByEmail.get(draft.to[0].toLowerCase()) : undefined);

  const addFiles = (files: File[]) => {
    let reservedBytes = attachmentBytes;
    const added: Upload[] = files.map((file, index) => {
      const key = `${Date.now()}-${index}-${file.name}`;
      let error = getAttachmentError(file);
      if (!error && reservedBytes + file.size > MAX_ATTACHMENT_BYTES) {
        error = "Attachments can't be more than 20 MB in total.";
      }
      if (!error) reservedBytes += file.size;
      return { key, name: file.name, size: file.size, status: error ? "error" : "uploading", progress: 0, error: error ?? undefined };
    });
    setUploads((current) => [...current, ...added]);

    const patchUpload = (key: string, patch: Partial<Upload>) =>
      setUploads((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

    added.forEach((item, index) => {
      if (item.status !== "uploading") return;
      const controller = new AbortController();
      uploadControllersRef.current.set(item.key, controller);
      uploadAttachment(files[index], (progress) => patchUpload(item.key, { progress }), controller.signal)
        .then((attachment) => {
          patchUpload(item.key, { status: "done", progress: 100, attachment });
          markEdited();
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            patchUpload(item.key, { status: "error", error: toInboxError(error).message });
          }
        })
        .finally(() => uploadControllersRef.current.delete(item.key));
    });
  };

  const removeUpload = (key: string) => {
    uploadControllersRef.current.get(key)?.abort();
    setUploads((current) => current.filter((item) => item.key !== key));
    markEdited();
  };

  const hasText = draft.subject.trim() !== "" || draft.body.trim() !== "";

  /** Runs `apply` now, or after confirming when it would overwrite text. */
  const replaceContent = (apply: () => Promise<void> | void, what: string) => {
    if (!hasText) {
      void apply();
      return;
    }
    setConfirm({
      title: what,
      description: "Replace current content with this template?",
      confirmLabel: "Replace",
      onConfirm: apply,
    });
  };

  const applyTemplate = (template: EmailTemplate) => {
    setTemplateAnchor(null);
    replaceContent(async () => {
      setIsApplyingTemplate(true);
      try {
        // The backend greets with "Hi there," when no name is known.
        const rendered = await renderTemplate(template.key, { recipientName: recipientNameFor() });
        setDraft((current) => ({ ...current, subject: rendered.subject, body: htmlToText(rendered.bodyHtml) }));
        setTemplateId(template.id);
        markEdited();
      } catch (error) {
        notify(toInboxError(error).message);
      } finally {
        setIsApplyingTemplate(false);
      }
    }, `Use "${template.name}"?`);
  };

  // AI text only fills the editor; HR reviews it and presses Send.
  const writeWithAi = async () => {
    setIsWriting(true);
    try {
      const result = await aiWrite({
        prompt: aiPrompt.trim(),
        tone: aiTone,
        recipientName: recipientNameFor(),
      });
      setAiAnchor(null);
      const apply = () => {
        setDraft((current) => ({
          ...current,
          subject: current.subject.trim() || !result.subject ? current.subject : result.subject,
          body: htmlToText(result.bodyHtml),
        }));
        markEdited();
      };
      if (draft.body.trim()) {
        setConfirm({
          title: "Use the AI draft?",
          description: "Replace the current message with the AI draft?",
          confirmLabel: "Replace",
          onConfirm: apply,
        });
      } else {
        apply();
      }
    } catch (error) {
      notify(toInboxError(error).message);
    } finally {
      setIsWriting(false);
    }
  };

  const handleSend = async () => {
    setTouched(new Set(["to", "cc", "bcc", "subject", "body"]));
    if (!isValid || isUploading || isSending) return;
    doneRef.current = true;
    if (savingRef.current) await savingRef.current;
    try {
      const response = await send(
        { ...buildPayload(), mode: init.mode, draftId: draftIdRef.current },
        init.threadId,
      );
      if (!response) return;
      notify("Sending…");
      onClose();
    } catch (error) {
      doneRef.current = false;
      const inboxError = toInboxError(error);
      notify(
        inboxError.message,
        inboxError.isNetworkError ? { label: "Retry", onClick: () => void sendRef.current() } : undefined,
      );
    }
  };
  // The toast's Retry reuses the same attempt (and Idempotency-Key).
  const sendRef = useRef(handleSend);
  useEffect(() => {
    sendRef.current = handleSend;
  });

  const close = () => {
    doneRef.current = true;
    onClose();
  };

  const discard = async () => {
    doneRef.current = true;
    uploadControllersRef.current.forEach((controller) => controller.abort());
    if (savingRef.current) await savingRef.current;
    if (draftIdRef.current) {
      await deleteDraft(draftIdRef.current);
      invalidateInbox(queryClient);
    }
    onClose();
  };

  const requestClose = () => {
    if (isDirty && hasContent) setSavePromptOpen(true);
    else close();
  };

  const saveAndClose = async () => {
    if (await saveDraft()) {
      notify("Draft saved");
      close();
    } else {
      notify("Couldn't save the draft. Try again.");
    }
  };

  const requestDiscard = () => {
    if (!hasContent && !draftIdRef.current) {
      close();
      return;
    }
    setConfirm({
      title: "Discard this draft?",
      description: "The message and its attachments will be deleted.",
      confirmLabel: "Discard",
      danger: true,
      onConfirm: async () => {
        try {
          await discard();
        } catch (error) {
          doneRef.current = false;
          throw toInboxError(error);
        }
      },
    });
  };

  const isFullDialog = expanded || isPhone;
  const canSend = isValid && !isUploading && !isBusy;

  const renderRecipientField = (field: RecipientField, label: string, trailing?: React.ReactNode) => (
    <Box sx={{ borderBottom: `1px solid ${INBOX_COLORS.divider}` }}>
      <Stack direction="row" sx={{ alignItems: "center", px: 2, minHeight: 44 }}>
        <Typography component="label" htmlFor={`${titleId}-${field}`} sx={{ width: 36, fontSize: "0.85rem", color: INBOX_COLORS.muted }}>
          {label}
        </Typography>
        <Autocomplete
          multiple
          freeSolo
          autoSelect
          id={`${titleId}-${field}`}
          size="small"
          options={recipientOptions}
          filterOptions={filterRecipients}
          value={draft[field]}
          onChange={(_, value) => update(field, value.map((email) => email.trim()).filter(Boolean))}
          onBlur={() => touch(field)}
          sx={{ flex: 1, minWidth: 0 }}
          renderValue={(value, getItemProps) =>
            value.map((email, index) => {
              const { key, ...itemProps } = getItemProps({ index });
              const invalid = !isValidEmail(email);
              return (
                <Chip
                  key={key}
                  {...itemProps}
                  size="small"
                  label={nameByEmail.get(email.toLowerCase()) ?? email}
                  title={email}
                  color={invalid ? "error" : "default"}
                  variant={invalid ? "outlined" : "filled"}
                />
              );
            })
          }
          renderOption={(props, email) => {
            const { key, ...optionProps } = props;
            return (
              <li key={key} {...optionProps}>
                <ListItemText
                  primary={nameByEmail.get(email.toLowerCase()) ?? email}
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
                htmlInput: {
                  ...params.slotProps.htmlInput,
                  "aria-invalid": Boolean(errorFor(field)),
                  "aria-describedby": errorFor(field) ? `${titleId}-${field}-error` : undefined,
                },
                input: { ...params.slotProps.input, disableUnderline: true, sx: { fontSize: "0.88rem" } },
              }}
            />
          )}
        />
        {trailing}
      </Stack>
      {errorFor(field) && (
        <Typography id={`${titleId}-${field}-error`} variant="caption" sx={{ display: "block", px: 2, pb: 0.6, color: "error.main" }}>
          {errorFor(field)}
        </Typography>
      )}
    </Box>
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
        {draft.subject.trim() || init.title}
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
            requestClose();
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

  const templates = templatesQuery.data ?? [];
  const renderTemplateItems = () => {
    if (templatesQuery.isPending) {
      return [0, 1, 2].map((index) => (
        <MenuItem key={index} disabled sx={{ width: 220 }}>
          <Skeleton width="100%" />
        </MenuItem>
      ));
    }
    if (templates.length === 0) {
      return (
        <MenuItem disabled sx={{ fontSize: "0.9rem" }}>
          No templates available
        </MenuItem>
      );
    }
    return templates.map((template) => (
      <MenuItem key={template.id} onClick={() => applyTemplate(template)} sx={{ fontSize: "0.9rem" }}>
        {template.name}
      </MenuItem>
    ));
  };

  const saveStatus: Record<SaveState, string> = {
    idle: "",
    saving: "Saving…",
    saved: isDirty ? "" : "Saved",
    error: "Couldn't save draft",
  };

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
          onBlur={() => touch("subject")}
          error={Boolean(errorFor("subject"))}
          helperText={errorFor("subject")}
          slotProps={{
            htmlInput: { "aria-label": "Subject" },
            input: { disableUnderline: true, sx: { fontSize: "0.9rem", py: 1 } },
          }}
        />
      </Box>

      {/* Formatting toolbar (visual only; messages are sent as plain paragraphs). */}
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
      </Stack>

      <Box sx={{ flex: 1, minHeight: 160, overflowY: "auto", px: 2, py: 1.5 }}>
        <TextField
          fullWidth
          multiline
          minRows={isFullDialog ? 14 : 8}
          variant="standard"
          placeholder="Write your message…"
          value={draft.body}
          disabled={isWriting || isApplyingTemplate}
          onChange={(event) => update("body", event.target.value)}
          onBlur={() => touch("body")}
          error={Boolean(errorFor("body"))}
          helperText={errorFor("body")}
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
        {init.mode === "forward" && (
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: INBOX_COLORS.muted }}>
            The original message and its attachments will be included.
          </Typography>
        )}
        {uploads.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.8, mt: 1 }} aria-label="Attachments">
            {uploads.map((item) => (
              <Box key={item.key} sx={{ maxWidth: "100%" }}>
                <Chip
                  size="small"
                  icon={
                    item.status === "error" ? (
                      <ErrorOutlined />
                    ) : (
                      <AttachFile sx={{ transform: "rotate(45deg)" }} />
                    )
                  }
                  label={`${item.name} (${formatFileSize(item.size)})`}
                  title={item.error ?? item.name}
                  onDelete={() => removeUpload(item.key)}
                  color={item.status === "error" ? "error" : "default"}
                  variant={item.status === "error" ? "outlined" : "filled"}
                  sx={{
                    maxWidth: "100%",
                    fontWeight: 600,
                    ...(item.status !== "error" && { bgcolor: INBOX_COLORS.selected, color: INBOX_COLORS.text }),
                  }}
                />
                {item.status === "uploading" && (
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    aria-label={`Uploading ${item.name}`}
                    sx={{ mt: 0.3, height: 3, borderRadius: 2 }}
                  />
                )}
                {item.status === "error" && item.error && (
                  <Typography variant="caption" sx={{ display: "block", color: "error.main", pl: 0.5 }}>
                    {item.error}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
        {errorFor("attachments") && (
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "error.main" }}>
            {errors.attachments}
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: INBOX_COLORS.divider }} />
      {/* On phones, keep the corner free for the global "Chat AI" button. */}
      <Stack direction="row" sx={{ alignItems: "center", p: 1.2, pr: { xs: 9, sm: 1.2 }, gap: 0.8, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          endIcon={isSending ? <CircularProgress size={14} color="inherit" /> : <Send />}
          disabled={!canSend}
          onClick={() => void handleSend()}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2.5, bgcolor: INBOX_COLORS.primary, boxShadow: "none" }}
        >
          {isSending ? "Sending…" : "Send"}
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
            addFiles(Array.from(event.target.files ?? []));
            touch("attachments");
            event.target.value = "";
          }}
        />
        <Button
          size="small"
          startIcon={isApplyingTemplate ? <CircularProgress size={14} color="inherit" /> : <DescriptionOutlined />}
          endIcon={<ExpandMore />}
          aria-haspopup="menu"
          aria-expanded={Boolean(templateAnchor)}
          disabled={isApplyingTemplate}
          onClick={(event) => setTemplateAnchor(event.currentTarget)}
          sx={{ textTransform: "none", fontWeight: 600, color: INBOX_COLORS.text }}
        >
          Use Template
        </Button>
        <Menu anchorEl={templateAnchor} open={Boolean(templateAnchor)} onClose={() => setTemplateAnchor(null)}>
          {renderTemplateItems()}
        </Menu>
        <Button
          size="small"
          onClick={(event) => setAiAnchor(event.currentTarget)}
          disabled={isWriting}
          aria-haspopup="dialog"
          aria-expanded={Boolean(aiAnchor)}
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
        <Popover
          open={Boolean(aiAnchor)}
          anchorEl={aiAnchor}
          onClose={() => setAiAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{ paper: { sx: { p: 2, width: 320, maxWidth: "calc(100vw - 24px)", borderRadius: 3 } } }}
        >
          <Stack
            spacing={1.5}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (aiPrompt.trim()) void writeWithAi();
            }}
          >
            <Typography sx={{ fontWeight: 700, color: INBOX_COLORS.heading }}>Write with AI</Typography>
            <TextField
              select
              size="small"
              label="Tone"
              value={aiTone}
              onChange={(event) => setAiTone(event.target.value)}
            >
              {AI_TONES.map((tone) => (
                <MenuItem key={tone} value={tone}>
                  {tone}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="What should it say?"
              placeholder="e.g. Invite them to a technical interview next week"
              multiline
              minRows={2}
              autoFocus
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
            />
            <Typography variant="caption" sx={{ color: INBOX_COLORS.muted }}>
              The draft goes into the editor. Review it before sending.
            </Typography>
            <Button
              type="submit"
              variant="contained"
              disabled={!aiPrompt.trim() || isWriting}
              startIcon={isWriting ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome />}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#6d28d9", boxShadow: "none" }}
            >
              {isWriting ? "Writing…" : "Generate"}
            </Button>
          </Stack>
        </Popover>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" aria-live="polite" sx={{ color: saveState === "error" ? "error.main" : INBOX_COLORS.muted }}>
          {saveStatus[saveState]}
        </Typography>
        <Button
          size="small"
          onClick={() => void saveAndClose()}
          disabled={!hasContent || saveState === "saving" || isSending}
          sx={{ textTransform: "none", fontWeight: 600, color: INBOX_COLORS.primary }}
        >
          Save Draft
        </Button>
        <Tooltip title="Discard">
          <IconButton aria-label="Discard draft" onClick={requestDiscard} disabled={isSending} sx={{ color: INBOX_COLORS.muted }}>
            <DeleteOutlined />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );

  const dialogs = (
    <>
      <ConfirmationModal
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        confirmTone={confirm?.danger ? "danger" : "default"}
        onConfirm={async () => {
          await confirm?.onConfirm();
        }}
        onClose={() => setConfirm(null)}
      />
      <Dialog open={savePromptOpen} onClose={() => setSavePromptOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: INBOX_COLORS.heading }}>Save as draft?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: INBOX_COLORS.subtle }}>
            You have unsaved changes. Save them to Drafts before closing?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="error"
            onClick={() => {
              setSavePromptOpen(false);
              discard().catch((error) => {
                doneRef.current = false;
                notify(toInboxError(error).message);
              });
            }}
            sx={{ textTransform: "none", mr: "auto" }}
          >
            Discard
          </Button>
          <Button onClick={() => setSavePromptOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setSavePromptOpen(false);
              void saveAndClose();
            }}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: INBOX_COLORS.primary, boxShadow: "none" }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (isFullDialog) {
    return (
      <>
        <Dialog
          open
          onClose={requestClose}
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
        {dialogs}
      </>
    );
  }

  return (
    <>
      <Paper
        role="dialog"
        aria-labelledby={titleId}
        elevation={0}
        onKeyDown={(event) => {
          // Menus and popovers are portaled but still bubble here; let them
          // close themselves without minimizing the composer.
          if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) {
            setMinimized(true);
          }
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
      {dialogs}
    </>
  );
}
