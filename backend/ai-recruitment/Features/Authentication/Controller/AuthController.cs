using ai_recruitment.Data;
using ai_recruitment.Features.Authentication.Dto;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Features.Users.Model;
using ai_recruitment.Service;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Authentication.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public AuthController(AppDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = _tokenService.GenerateToken(
                user.Id.ToString(),
                user.Email,
                new[] { user.Role.RoleName },
                out var expiresAt);

            return Ok(new LoginResponseDto
            {
                Token = token,
                ExpiresAt = expiresAt,
                User = new UserDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt,
                    RoleId = user.RoleId,
                    RoleName = user.Role.RoleName,
                    InsertedBy = user.InsertedBy
                }
            });
        }
    }
}
