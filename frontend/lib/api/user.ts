import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import {
  EditUserPayload,
  GetUsersPayload,
  GetUsersResponse,
  InvitationValidationResult,
  ResendInvitationResponse,
  SetInvitationPasswordPayload,
  SetInvitationPasswordResponse,
  UpdatePhoneNumberPayload,
  UploadPhotoResponse,
  UserItem,
  UserPayload,
} from "../types/user";

const USER_ENDPOINT = `${BackendServer}/api/Users`;

export const insertUser = async (user: UserPayload) => {
  return api.post(`${USER_ENDPOINT}/insertUser`, user);
};

export const getUsers = async (
  payload: GetUsersPayload,
): Promise<GetUsersResponse> => {
  const params = new URLSearchParams({
    pageNumber: String(payload.pageNumber),
    pageSize: String(payload.pageSize),
  });

  if (payload.roleId !== undefined) {
    params.set("roleId", String(payload.roleId));
  }

  if (payload.status !== undefined) {
    params.set("status", String(payload.status));
  }

  return api.get<GetUsersResponse>(
    `${USER_ENDPOINT}/getAllUsers?${params.toString()}`,
  );
};

export const getUser = async (id: string) => {
  return api.get<UserItem>(`${USER_ENDPOINT}/getUser/${id}`);
};

export const updateUserStatus = async (id: string, status: boolean) => {
  return api.put(`${USER_ENDPOINT}/updateUserStatus/${id}`, status);
};

export const editUser = async (id: string, payload: EditUserPayload) => {
  return api.put(`${USER_ENDPOINT}/editUser/${id}`, payload);
};

export const updatePhoneNumber = async (
  id: string,
  payload: UpdatePhoneNumberPayload,
) => {
  return api.put(`${USER_ENDPOINT}/updatePhoneNumber/${id}`, payload);
};

export const uploadProfilePicture = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post<UploadPhotoResponse, FormData>(
    `${USER_ENDPOINT}/uploadProfilePicture/${id}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
};

// Invitation endpoints below are [AllowAnonymous] on the backend; the shared
// client still attaches a token if one exists, which those endpoints ignore.

/** Checks an invitation link without consuming it. */
export const validateInvitation = async (token: string) => {
  return api.get<InvitationValidationResult>(
    `${USER_ENDPOINT}/validateInvitation`,
    { params: { token } },
  );
};

/** Sets the invited user's first password and consumes the invitation. */
export const setInvitationPassword = async (
  payload: SetInvitationPasswordPayload,
) => {
  return api.post<SetInvitationPasswordResponse, SetInvitationPasswordPayload>(
    `${USER_ENDPOINT}/setInvitationPassword`,
    payload,
  );
};

/** Revokes the user's pending invitation and emails a new one. */
export const resendInvitation = async (userId: string) => {
  return api.post<ResendInvitationResponse>(
    `${USER_ENDPOINT}/resendInvitation/${userId}`,
  );
};
