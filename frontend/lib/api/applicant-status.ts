import { api } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";

const APPLICANT_STATUS_ENDPOINT = `${BackendServer}/api/ApplicantStatus`;

export interface ApplicantStatusItem {
  statusId: number;
  statusName: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export const getApplicantStatuses = async (): Promise<
  ApplicantStatusItem[]
> => {
  return api.get<ApplicantStatusItem[]>(APPLICANT_STATUS_ENDPOINT);
};
