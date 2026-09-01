export interface JobItem {
  jobId: number;
  jobTitle: string;
  jobStatus: string;
  department: string;
  createdAt: string;
  applicantCount: number;
}

export interface InsertJobPayload {
  jobTitle: string;
  location: string;
  jobType: string;
  jobStatus: string;
  jobDescription: string;
  qualifications: string[];
  techSkills: string[];
  department: string;
}

export interface JobDetailsResponse {
  jobId: number;
  jobTitle: string;
  department: string;
  location: string;
  jobType: string;
  jobStatus: string;
  jobDescription: string;
  qualifications: string[];
  techSkills: string[];
  createdAt: string;
}

export interface InsertJobResponse {
  message: string;
  jobDetails: InsertJobPayload;
}

export interface GetAllJobsResponse {
  data: JobItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPage: number;
}

export interface EditJobPayload {
  jobTitle: string;
  location: string;
  jobType: string;
  jobStatus: string;
  jobDescription: string;
  qualifications: string[];
  techSkills: string[];
  department: string;
}
