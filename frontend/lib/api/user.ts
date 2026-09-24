import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import { UserPayload } from "../types/user";

const USER_ENDPOINT = `${BackendServer}/api/Users`;

export const insertUser = async (user: UserPayload) => {
  return api.post(`${USER_ENDPOINT}/insertUser`, user);
};
