using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Users.Model
{
    public enum InvitationDeliveryStatus
    {
        Pending,
        Sent,
        Failed,
    }

    // One-time token that lets a newly created (pending) user set their initial password.
    // A user can accumulate several rows over time (e.g. after a resend); only the most
    // recently issued, unconsumed, non-invalidated, unexpired one is usable.
    public class UserInvitation
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        // SHA-256 hex digest of the raw token. The raw token itself is never persisted.
        [Required]
        [MaxLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }

        // Concurrency token: EF Core includes this property's originally-loaded value in
        // the UPDATE's WHERE clause, so if two requests race to consume the same invitation,
        // whichever commits first wins and the other gets a DbUpdateConcurrencyException
        // instead of both successfully marking the token used.
        public DateTime? ConsumedAt { get; set; }

        // Set when a newer invitation supersedes this one (e.g. "resend invitation").
        public DateTime? InvalidatedAt { get; set; }

        public InvitationDeliveryStatus DeliveryStatus { get; set; } = InvitationDeliveryStatus.Pending;
        public DateTime? DeliveryAttemptedAt { get; set; }

        [MaxLength(500)]
        public string? DeliveryError { get; set; }

        public bool IsUsable(DateTime utcNow) =>
            ConsumedAt == null && InvalidatedAt == null && ExpiresAt > utcNow;
    }
}
