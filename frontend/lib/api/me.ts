import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import { MyPermissionsResponse } from "../types/permission";

const ME_ENDPOINT = `${BackendServer}/api/me`;

export const getMyPermissions = async (): Promise<MyPermissionsResponse> => {
  return api.get<MyPermissionsResponse>(`${ME_ENDPOINT}/permissions`);
};
