import { AxiosResponse } from "axios";

import { api, apiClient } from "@/lib/api-client";

import BackendServer from "@/constant/server-address";
import {
  InsertJobPayload,
  JobDetailsResponse,
  InsertJobResponse,
  GetAllJobsResponse,
  EditJobPayload,
} from "../types/job";

const JOB_ENDPOINT = `${BackendServer}/api/Job`;

export const getAllJobs = async (
  jobStatus: string,
  pageNumber = 1,
  pageSize = 10,
): Promise<GetAllJobsResponse> => {
  return api.get<GetAllJobsResponse>(
    `${JOB_ENDPOINT}/getAllJob?jobStatus=${jobStatus}&pageNumber=${pageNumber}&pageSize=${pageSize}`,
  );
};

export const insertJob = (
  payload: InsertJobPayload,
): Promise<AxiosResponse<InsertJobResponse>> => {
  return apiClient.post<InsertJobResponse>(
    `${JOB_ENDPOINT}/insertJob`,
    payload,
  );
};

export const getJobDetails = async (
  jobId: number,
): Promise<JobDetailsResponse> => {
  return api.get<JobDetailsResponse>(`${JOB_ENDPOINT}/getJob/${jobId}`);
};

export const updateJobStatus = async (
  jobId: number,
  newStatus: string,
): Promise<AxiosResponse<void>> => {
  return apiClient.put<void>(
    `${JOB_ENDPOINT}/updateJobStatus/${jobId}`,
    newStatus,
  );
};

export const editJob = async (
  jobId: number,
  payload: EditJobPayload,
): Promise<AxiosResponse<void>> => {
  return apiClient.put<void>(`${JOB_ENDPOINT}/editJob/${jobId}`, payload);
};
