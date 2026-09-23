using ai_recruitment.Features.Users.Dto;

namespace ai_recruitment.Features.Authentication.Dto
{
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public UserDto User { get; set; } = null!;
    }
}
