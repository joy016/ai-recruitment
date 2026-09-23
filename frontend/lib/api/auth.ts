import { api } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";
import { LoginPayload, LoginResponse } from "@/lib/types/auth";

const AUTH_ENDPOINT = `${BackendServer}/api/Auth`;

export const login = (payload: LoginPayload): Promise<LoginResponse> => {
  return api.post<LoginResponse, LoginPayload>(
    `${AUTH_ENDPOINT}/login`,
    payload,
  );
};
