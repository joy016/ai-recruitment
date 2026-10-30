import { api } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";
import { ApplicantScreeningResponse } from "../types/screening";

const APPLICANT_SCREENING_ENDPOINT = `${BackendServer}/api/ApplicantScreening`;

// 404 means the candidate has no screening result yet.
export const getApplicantScreening = async (
  candidateId: string,
  signal?: AbortSignal,
): Promise<ApplicantScreeningResponse> => {
  return api.get<ApplicantScreeningResponse>(
    `${APPLICANT_SCREENING_ENDPOINT}/${encodeURIComponent(candidateId)}`,
    { signal },
  );
};
