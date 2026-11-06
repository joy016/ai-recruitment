namespace ai_recruitment.Features.ApplicantScreening.Services
{
    public enum ScreeningStatusValue
    {
        Completed,
        ManualReviewRequired,
        UnreadableResume,
        Unknown,
    }

    public enum ScreeningRecommendationValue
    {
        Pass,
        Fail,
        ManualReview,
        Unknown,
    }

    // The single source of truth for turning the AI agent's raw
    // (screeningStatus, recommendation, requiresHumanReview) callback into the candidate
    // status ApplicantScreeningController.SubmitResults should move to, plus - when that
    // status is "Manual Review" - the reason shown to recruiters.
    //
    // Safety rule (from product): only ScreeningStatus=Completed AND Recommendation=Pass AND
    // RequiresHumanReview=false yields "AI Screening passed". Every other combination -
    // including an unknown/missing value or a self-contradictory one (e.g. Pass with
    // RequiresHumanReview=true) - falls back to "Manual Review" so a result is never
    // silently dropped.
    public static class AiScreeningStatusMapper
    {
        public const string AiScreeningPassedStatusName = "AI Screening passed";
        public const string ManualReviewStatusName = "Manual Review";
        public const string ScreeningStatusName = "Screening";

        // Candidate statuses an inbound screening result is allowed to auto-advance from.
        // Anything else means a recruiter already moved the candidate past screening, and
        // this callback must never overwrite that decision. "Application Submitted" is kept
        // for backward compatibility with candidates created before ScreeningStatusName
        // became the default initial status.
        private static readonly HashSet<string> EligibleCurrentStatusNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "Application Submitted",
            ScreeningStatusName,
            ManualReviewStatusName,
        };

        public static bool IsEligibleForAutoUpdate(string? currentStatusName) =>
            !string.IsNullOrWhiteSpace(currentStatusName) && EligibleCurrentStatusNames.Contains(currentStatusName.Trim());

        public static ScreeningStatusValue ParseScreeningStatus(string? value) =>
            value?.Trim().ToUpperInvariant() switch
            {
                "COMPLETED" => ScreeningStatusValue.Completed,
                "MANUAL_REVIEW_REQUIRED" => ScreeningStatusValue.ManualReviewRequired,
                "UNREADABLE_RESUME" => ScreeningStatusValue.UnreadableResume,
                _ => ScreeningStatusValue.Unknown,
            };

        public static ScreeningRecommendationValue ParseRecommendation(string? value) =>
            value?.Trim().ToUpperInvariant() switch
            {
                "PASS" => ScreeningRecommendationValue.Pass,
                "FAIL" => ScreeningRecommendationValue.Fail,
                "MANUAL_REVIEW" => ScreeningRecommendationValue.ManualReview,
                _ => ScreeningRecommendationValue.Unknown,
            };

        public static (string StatusName, string? ManualReviewReason) Map(
            string? screeningStatus,
            string? recommendation,
            bool? requiresHumanReview)
        {
            var status = ParseScreeningStatus(screeningStatus);
            var recommendationValue = ParseRecommendation(recommendation);

            if (status == ScreeningStatusValue.Completed
                && recommendationValue == ScreeningRecommendationValue.Pass
                && requiresHumanReview == false)
            {
                return (AiScreeningPassedStatusName, null);
            }

            if (status == ScreeningStatusValue.ManualReviewRequired)
            {
                return (ManualReviewStatusName, "Borderline or unverified information");
            }

            if (status == ScreeningStatusValue.UnreadableResume)
            {
                return (ManualReviewStatusName, "Resume could not be read - check the file");
            }

            if (status == ScreeningStatusValue.Completed && recommendationValue == ScreeningRecommendationValue.Fail)
            {
                return (ManualReviewStatusName, "AI recommends rejection - please confirm");
            }

            // Anything else: null/unknown screeningStatus or recommendation, or a
            // contradictory combination (e.g. Pass with requiresHumanReview=true). Never
            // drop the result silently - fall back to Manual Review with a generic reason.
            return (ManualReviewStatusName, "AI response was unexpected or inconsistent - please review");
        }
    }
}
