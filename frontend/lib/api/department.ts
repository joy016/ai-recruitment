import BackendServer from "@/constant/server-address";
import { api } from "@/lib/api-client";
import { Department } from "../types/department";

const DEPARTMENT_ENDPOINT = `${BackendServer}/api/Departments`;

export const getDepartment = async (): Promise<Department[]> => {
  return api.get<Department[]>(`${DEPARTMENT_ENDPOINT}/getAllDepartment`);
};
