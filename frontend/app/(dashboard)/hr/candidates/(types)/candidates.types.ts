import { PaginatedResponse } from "./candidates.types";
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

/** Reusable paginated list response; `T` is the item type. */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface NewCandidates {
  candidateId: string;
  candidateName: string;
  position: string;
  appliedDate: string;
  workExperience: string;
  applicationSource: string | null;
}

export interface CandidatesInterviewToday {
  candidateId: string;
  candidateName: string;
  positionApplied: string;
  applicationStatus: string;
  interviewTime: string;
  interviewer: string | null;
}

// GET /getCandidates names the page field `currentPage` and adds `status`.
export type GetCandidatesResponse = Omit<
  PaginatedResponse<Candidate>,
  "pageNumber"
> & {
  status: number;
  currentPage: number;
};

export type GetNewCandidatesResponse = PaginatedResponse<NewCandidates>;

// GET /getCandidatesForInterviewToday returns the full list, not paged.
export type GetCandidatesInterviewTodayResponse =
  PaginatedResponse<CandidatesInterviewToday>;
