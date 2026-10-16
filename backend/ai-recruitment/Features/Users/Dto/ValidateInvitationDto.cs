using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Users.Dto
{
    /// <summary>
    /// Body for the POST form of validateInvitation. Retained so clients that already
    /// post the token keep working; GET /api/Users/validateInvitation?token= is the
    /// documented route.
    /// </summary>
    public class ValidateInvitationDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }
}
