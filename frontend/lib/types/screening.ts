/**
 * GET /api/ApplicantScreening/{candidateId} — the AI (n8n) evaluation of a
 * candidate. Advisory only; it never changes the applicant status.
 * `candidate` and `job` navigation properties come back null, so don't rely
 * on them.
 */
export interface ApplicantScreeningResponse {
  id: string;
  candidateId: string;
  jobId: number;
  /** 0–100; null when the screening didn't produce a score. */
  qualificationScore: number | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  /** Free text from n8n (max 200 chars), usually PASS / NEEDS_REVIEW / FAIL. */
  recommendation: string | null;
  summary: string | null;
  /** e.g. COMPLETED, MANUAL_REVIEW_REQUIRED, UNREADABLE_RESUME. */
  screeningStatus: string;
  screenedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}
