using ai_recruitment.Features.Candidates.model;

namespace ai_recruitment.Features.Candidates.Services
{
    public interface ICandidateStatusChangeService
    {
        // Sets ApplicantStatusId/UpdatedAt on the tracked entity if newStatusId differs from
        // the candidate's current status. Does NOT call SaveChangesAsync - the caller saves,
        // so this can be combined with other field edits (e.g. interview schedule, or a
        // screening-result upsert) in a single SaveChangesAsync/transaction.
        // Returns false (nothing staged) if newStatusId already equals the current status.
        bool StageStatusChange(Candidate candidate, int newStatusId);

        // Call once the staged change from StageStatusChange has been persisted. Sends the
        // in-app "status changed" notification and, if the new status is one
        // CandidateStatusNotifications knows about, enqueues the candidate.status.changed
        // webhook - identical side effects regardless of caller (HR UI vs. AI screening).
        Task NotifyStatusChangedAsync(
            Candidate candidate,
            int previousStatusId,
            int newStatusId,
            string? changedBy,
            CancellationToken cancellationToken = default);
    }
}
