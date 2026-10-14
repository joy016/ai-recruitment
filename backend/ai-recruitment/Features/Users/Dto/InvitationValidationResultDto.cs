namespace ai_recruitment.Features.Users.Dto
{
    public class InvitationValidationResultDto
    {
        public bool IsValid { get; set; }

        // Only populated when IsValid is true - no other user information is exposed.
        public string? Email { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
