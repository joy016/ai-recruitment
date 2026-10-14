using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Users.Dto
{
    public class ValidateInvitationDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }
}
