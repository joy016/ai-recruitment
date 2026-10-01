import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import {
  GetUsersPayload,
  GetUsersResponse,
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
