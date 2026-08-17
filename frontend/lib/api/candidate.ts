import { api } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";
import { Candidate } from "@/app/(dashboard)/hr/candidates/(types)/candidates.types";

const APPLICANT_STATUS_ENDPOINT = `${BackendServer}/api/Candidates`;

export const getCandidateList = async (): Promise<Candidate[]> => {
  return api.get<Candidate[]>(APPLICANT_STATUS_ENDPOINT);
};
