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
  /** PASS | FAIL | MANUAL_REVIEW (case-insensitive); null if the AI did not report one. */
  recommendation: string | null;
  summary: string | null;
  /** e.g. COMPLETED, MANUAL_REVIEW_REQUIRED, UNREADABLE_RESUME. */
  screeningStatus: string;
  /** True if the AI agent itself flagged the result as needing a human look. */
  requiresHumanReview: boolean;
  /** Recruiter-facing reason this landed in Manual Review; null otherwise. */
  manualReviewReason: string | null;
  screenedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}
