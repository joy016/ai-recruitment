import { isAxiosError, type AxiosProgressEvent } from "axios";
import { api } from "@/lib/api-client";
import BackendServer from "@/constant/server-address";
import type {
  AiSuggestReplyResponse,
  AiWritePayload,
  AiWriteResponse,
  BulkAction,
  EmailMessage,
  EmailTemplate,
  GetMessagesParams,
  InboxAttachment,
  InboxCounts,
  InboxThread,
  InboxThreadListResponse,
  PatchMessagePayload,
  RenderedTemplate,
  SaveDraftPayload,
  SendEmailPayload,
  SendEmailResponse,
} from "@/lib/types/inbox";

const INBOX_ENDPOINT = `${BackendServer}/api/inbox`;
const TEMPLATES_ENDPOINT = `${BackendServer}/api/email-templates`;

export const INBOX_EVENTS_URL = `${INBOX_ENDPOINT}/events`;

/** Uploads can be up to 20 MB, well past the client's default timeout. */
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * The one error type the Inbox UI shows. Backend errors arrive as
 * `{ error: { code, message } }`; anything else is mapped to a code here.
 */
export class InboxApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  /** No response at all (offline, timeout, CORS): safe to retry as-is. */
  readonly isNetworkError: boolean;

  constructor(code: string, message: string, status: number | null, isNetworkError = false) {
    super(message);
    this.name = "InboxApiError";
    this.code = code;
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

type BackendErrorBody = { error?: { code?: string; message?: string } };

export const toInboxError = (error: unknown): InboxApiError => {
  if (error instanceof InboxApiError) return error;

  if (isAxiosError<BackendErrorBody>(error)) {
    const status = error.response?.status ?? null;
    if (status === null) {
      return new InboxApiError(
        "NETWORK_ERROR",
        "Can't reach the server. Check your connection and try again.",
        null,
        true,
      );
    }
    const body = error.response?.data?.error;
    if (body?.message) {
      return new InboxApiError(body.code ?? "ERROR", body.message, status);
    }
    if (status === 403) {
      return new InboxApiError("FORBIDDEN", "You don't have access to this part of the Inbox.", status);
    }
    if (status === 401) {
      return new InboxApiError("UNAUTHORIZED", "Your session has expired. Please sign in again.", status);
    }
    if (status === 429) {
      return new InboxApiError("RATE_LIMITED", "Too many requests. Wait a moment and try again.", status);
    }
    return new InboxApiError("ERROR", "Something went wrong. Please try again.", status);
  }

  return new InboxApiError("ERROR", "Something went wrong. Please try again.", null);
};

/** Runs a request and rethrows failures as InboxApiError. */
const call = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    throw toInboxError(error);
  }
};

export const getMessages = ({
  folder,
  search,
  filter = "all",
  label,
  sort = "newest",
  page = 1,
  pageSize = 20,
}: GetMessagesParams) => {
  const params = new URLSearchParams({
    folder,
    filter,
    sort,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search?.trim()) params.set("search", search.trim());
  if (label) params.set("label", label);
  return call(() =>
    api.get<InboxThreadListResponse>(`${INBOX_ENDPOINT}/messages?${params.toString()}`),
  );
};

export const getCounts = () =>
  call(() => api.get<InboxCounts>(`${INBOX_ENDPOINT}/counts`));

export const getThread = (threadId: string, signal?: AbortSignal) =>
  call(() =>
    api.get<InboxThread>(`${INBOX_ENDPOINT}/threads/${encodeURIComponent(threadId)}`, { signal }),
  );

export const patchMessage = (id: string, body: PatchMessagePayload) =>
  call(() =>
    api.patch<{ message: string }, PatchMessagePayload>(
      `${INBOX_ENDPOINT}/messages/${encodeURIComponent(id)}`,
      body,
    ),
  );

export const bulkAction = (ids: string[], action: BulkAction) =>
  call(() =>
    api.patch<{ updatedCount: number }, { ids: string[]; action: BulkAction }>(
      `${INBOX_ENDPOINT}/messages/bulk`,
      { ids, action },
    ),
  );

export const deletePermanent = (id: string) =>
  call(() =>
    api.delete<void>(`${INBOX_ENDPOINT}/messages/${encodeURIComponent(id)}/permanent`),
  );

export const createDraft = (payload: SaveDraftPayload) =>
  call(() => api.post<EmailMessage, SaveDraftPayload>(`${INBOX_ENDPOINT}/drafts`, payload));

export const updateDraft = (id: string, payload: SaveDraftPayload) =>
  call(() =>
    api.put<EmailMessage, SaveDraftPayload>(
      `${INBOX_ENDPOINT}/drafts/${encodeURIComponent(id)}`,
      payload,
    ),
  );

export const deleteDraft = (id: string) =>
  call(() => api.delete<void>(`${INBOX_ENDPOINT}/drafts/${encodeURIComponent(id)}`));

export const uploadAttachment = (
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) => {
  const formData = new FormData();
  formData.append("file", file);
  return call(() =>
    api.post<InboxAttachment, FormData>(`${INBOX_ENDPOINT}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: UPLOAD_TIMEOUT_MS,
      signal,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    }),
  );
};

/**
 * Queues an email (202, status "sending"); the final state arrives over SSE.
 * Reusing `idempotencyKey` for a retry makes the backend return the original
 * message instead of sending twice.
 */
export const sendEmail = (payload: SendEmailPayload, idempotencyKey: string) =>
  call(() =>
    api.post<SendEmailResponse, SendEmailPayload>(`${INBOX_ENDPOINT}/send`, payload, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  );

export const retrySend = (id: string) =>
  call(() =>
    api.post<SendEmailResponse>(`${INBOX_ENDPOINT}/messages/${encodeURIComponent(id)}/retry`),
  );

export const getTemplates = () =>
  call(() => api.get<EmailTemplate[]>(TEMPLATES_ENDPOINT));

export const renderTemplate = (key: string, vars: { recipientName?: string }) =>
  call(() =>
    api.post<RenderedTemplate, { recipientName?: string }>(
      `${TEMPLATES_ENDPOINT}/${encodeURIComponent(key)}/render`,
      vars,
    ),
  );

export const aiWrite = (body: AiWritePayload) =>
  call(() => api.post<AiWriteResponse, AiWritePayload>(`${INBOX_ENDPOINT}/ai/write`, body));

export const aiSuggestReply = (threadId: string) =>
  call(() =>
    api.post<AiSuggestReplyResponse, { threadId: string }>(
      `${INBOX_ENDPOINT}/ai/suggest-reply`,
      { threadId },
    ),
  );
