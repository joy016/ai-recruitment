import { api } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";
import { Candidate } from "@/app/(dashboard)/hr/candidates/(types)/candidates.types";

const APPLICANT_STATUS_ENDPOINT = `${BackendServer}/api/Candidates`;

export const getCandidateList = async (): Promise<Candidate[]> => {
  return api.get<Candidate[]>(APPLICANT_STATUS_ENDPOINT);
};

export interface CreateCandidatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  yearsOfExperience: number;
  linkedInUrl?: string;
  coverLetter?: string;
  resume: File;
  role?: string;
  JobId: number;
}

export const createCandidate = async (
  payload: CreateCandidatePayload,
): Promise<Candidate> => {
  const formData = new FormData();
  formData.append("FirstName", payload.firstName);
  formData.append("LastName", payload.lastName);
  formData.append("Email", payload.email);
  formData.append("PhoneNumber", payload.phoneNumber);
  formData.append("YearsOfExperience", String(payload.yearsOfExperience));
  formData.append("LinkedInUrl", payload.linkedInUrl ?? "");
  formData.append("CoverLetter", payload.coverLetter ?? "");
  formData.append("Resume", payload.resume);
  formData.append("Role", payload.role ?? "");
  formData.append("JobId", payload.JobId.toString());

  return api.post<Candidate, FormData>(APPLICANT_STATUS_ENDPOINT, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
