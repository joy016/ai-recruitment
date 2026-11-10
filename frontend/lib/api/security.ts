import { isAxiosError } from "axios";
import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import {
  ActiveSession,
  ChangePasswordFieldError,
  ChangePasswordPayload,
  ChangePasswordResponse,
  LogoutAllSessionsResponse,
  SecuritySummary,
} from "../types/security";

const SECURITY_ENDPOINT = `${BackendServer}/api/Security`;

export const getSecuritySummary = async (): Promise<SecuritySummary> => {
  return api.get<SecuritySummary>(`${SECURITY_ENDPOINT}/getSecuritySummary`);
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> => {
  return api.post<ChangePasswordResponse, ChangePasswordPayload>(
    `${SECURITY_ENDPOINT}/changePassword`,
    payload,
  );
};

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
  return api.get<ActiveSession[]>(`${SECURITY_ENDPOINT}/getActiveSessions`);
};

export const revokeSession = async (sessionId: string): Promise<void> => {
  await api.delete(`${SECURITY_ENDPOINT}/revokeSession/${sessionId}`);
};

export const logoutAllSessions = async (): Promise<LogoutAllSessionsResponse> => {
  return api.post<LogoutAllSessionsResponse>(
    `${SECURITY_ENDPOINT}/logoutAllSessions`,
    { keepCurrent: false },
  );
};

/**
 * Maps a changePassword 400 ({ field, message }) onto the matching input, a
 * 429 onto a generic rate-limit message, and anything else onto a generic
 * "try again" message. Never treat a changePassword 400/429 as a 401 - the
 * caller must stay logged in.
 */
export const toChangePasswordFieldError = (error: unknown): ChangePasswordFieldError => {
  if (isAxiosError<{ field?: string; message?: string }>(error)) {
    if (error.response?.status === 429) {
      return { field: null, message: "Too many attempts. Try again later." };
    }

    if (error.response?.status === 400 && error.response.data?.message) {
      const field = error.response.data.field;
      return {
        field:
          field === "currentPassword" || field === "newPassword" || field === "confirmNewPassword"
            ? field
            : null,
        message: error.response.data.message,
      };
    }
  }

  return { field: null, message: "Unable to update your password. Please try again." };
};
