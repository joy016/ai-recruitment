export type ApplicantStatus =
  | "AI Screening passed"
  | "Initial Interview"
  | "Technical Interview"
  | "Final Interview"
  | "Job Offer"
  | "Requirements Gathering"
  | "Background Check"
  | "Onboarding"
  | "Offered"
  | "Rejected";

export interface Candidate {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  applicationDate: string;
  yearsOfExperience: string;
  interviewSched: string | null;
  applicantStatusId: number;
  resumePath: string;
}

export interface GetCandidatesResponse {
  status: number;
  data: Candidate[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface NewCandidates {
  candidateId: string;
  candidateName: string;
  position: string;
  appliedDate: string;
  workExperience: string;
  applicationSource: string | null;
}

export interface GetNewCandidatesResponse {
  data: NewCandidates[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
