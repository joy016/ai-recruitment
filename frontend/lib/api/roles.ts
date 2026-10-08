import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import { Role } from "@/app/(dashboard)/hr/accounts/(types)/account.types";
import { Interviewer } from "../types/user";

const ROLES_ENDPOINT = `${BackendServer}/api/Roles`;

export const getAllRoles = async (): Promise<Role[]> => {
  return api.get<Role[]>(`${ROLES_ENDPOINT}/getAllRoles`);
};

export const getInterviwer = async (): Promise<Interviewer[]> => {
  return api.get<Interviewer[]>(`${ROLES_ENDPOINT}/getInterviewer`);
};
