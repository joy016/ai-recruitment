using System.ComponentModel.DataAnnotations;
using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Security.Model
{
    // One row per issued JWT (keyed by its jti), so a specific login can be revoked without
    // affecting the user's other sessions. See SecurityService for how this is used both to
    // list/revoke "Active Sessions" and, via the JwtBearer OnTokenValidated event, to reject
    // requests from an already-revoked token before its own exp claim would otherwise expire it.
    public class UserSession
    {
        [Key]
        public Guid SessionId { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        // The JWT's "jti" claim. Unique per issued token.
        [Required]
        [MaxLength(64)]
        public string TokenId { get; set; } = string.Empty;

        public string? UserAgent { get; set; }

        [MaxLength(50)]
        public string? Browser { get; set; }

        [MaxLength(50)]
        public string? OperatingSystem { get; set; }

        [MaxLength(100)]
        public string DeviceLabel { get; set; } = string.Empty;

        [MaxLength(64)]
        public string? IpAddress { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
    }
}
