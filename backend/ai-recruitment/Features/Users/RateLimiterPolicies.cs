namespace ai_recruitment.Features.Users
{
    public static class RateLimiterPolicies
    {
        // Anonymous endpoints (validateInvitation, setInitialPassword): throttled per
        // client IP so a token can't be brute-forced or the password-setup endpoint hammered.
        public const string InvitationPublic = "invitation-public";

        // Admin-only resend: throttled per authenticated caller so one admin can't
        // email-bomb a user (or accidentally loop) by resending repeatedly.
        public const string InvitationResend = "invitation-resend";
    }
}
