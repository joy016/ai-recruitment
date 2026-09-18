import { api } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";
import {
  Candidate,
  GetCandidatesResponse,
  GetNewCandidatesResponse,
} from "@/app/(dashboard)/hr/candidates/(types)/candidates.types";
import {
  CreateCandidatePayload,
  UpdateStatusPayload,
} from "../types/candidate";
import { ApiResponse } from "../types/common";

const CANDIDATES_ENDPOINT = `${BackendServer}/api/Candidates`;

export const getCandidateList = async (
  jobId?: number | string,
  pageNumber = 1,
  pageSize = 10,
): Promise<GetCandidatesResponse> => {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  });
  if (jobId) {
    params.set("jobId", String(jobId));
  }

  return api.get<GetCandidatesResponse>(
    `${CANDIDATES_ENDPOINT}/getCandidates?${params.toString()}`,
  );
};

export const getNewCandidates = async (
  pageNumber: number,
  pageSize: number,
): Promise<GetNewCandidatesResponse> => {
  return api.get<GetNewCandidatesResponse>(
    `${CANDIDATES_ENDPOINT}/getNewCandidates?pageNumber=${pageNumber}&pageSize=${pageSize}`,
  );
};

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
  formData.append("PortfolioUrl", payload.portfolioUrl ?? "");
  formData.append("CoverLetter", payload.coverLetter ?? "");
  formData.append("Resume", payload.resume);
  formData.append("Role", payload.role ?? "");
  formData.append("JobId", payload.JobId.toString());
  formData.append("SourceOfApplication", payload.sourceOfApplication ?? "");
  return api.post<Candidate, FormData>(CANDIDATES_ENDPOINT, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateCandidateStatus = async (
  payload: UpdateStatusPayload,
): Promise<ApiResponse> => {
  return api.put<ApiResponse, UpdateStatusPayload>(
    `${CANDIDATES_ENDPOINT}/updateCandidateStatus`,
    payload,
  );
};
