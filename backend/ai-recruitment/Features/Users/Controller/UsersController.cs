using ai_recruitment.Data;
using ai_recruitment.Features.Users.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Features.Users.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<Model.User> _passwordHasher = new();

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("insertUser")]
        public async Task<IActionResult> InsertUser([FromBody] CreateUserDto dto)
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (existingUser != null)
            {
                return Conflict(new
                {
                    message = "A user with this email already exists."
                });
            }

            var roleExists = await _context.Roles.AnyAsync(r => r.RoleId == dto.RoleId);
            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "The specified role does not exist."
                });
            }

            var user = new Model.User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = normalizedEmail,
                RoleId = dto.RoleId,
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetUser),
                new { id = user.Id },
                new UserDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    RoleId = user.RoleId,
                    InsertedBy = user.InsertedBy
                }
            );
        }

        [HttpGet("getAllUsers")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int? roleId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var query = _context.Users.AsNoTracking().AsQueryable();

            if (roleId.HasValue)
            {
                query = query.Where(u => u.RoleId == roleId.Value);
            }

            query = query.OrderBy(u => u.FirstName);
            var totalCount = await query.CountAsync();

            var users = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt,
                    RoleId = u.RoleId,
                    RoleName = u.Role.RoleName
                })                  
                .ToListAsync();

            return Ok(new
            {
                data = users,
                pageNumber,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                totalCount
            });
        }

        [HttpGet("getUser/{id:guid}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _context.Users.AsNoTracking()
                .Where(u => u.Id == id)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt,
                    RoleId = u.RoleId,
                    RoleName = u.Role.RoleName
                })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound(new
                {
                    message = "User not found."
                });
            }

            return Ok(user);
        }

        [HttpPut("editUser/{id:guid}")]
        public async Task<IActionResult> EditUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "User not found."
                });
            }

            var roleExists = await _context.Roles.AnyAsync(r => r.RoleId == dto.RoleId);
            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "The specified role does not exist."
                });
            }

            var emailTaken = await _context.Users
                .AnyAsync(u => u.Id != id && u.Email == normalizedEmail);

            if (emailTaken)
            {
                return Conflict(new
                {
                    message = "A user with this email already exists."
                });
            }

            user.FirstName = dto.FirstName;
            user.LastName = dto.LastName;
            user.Email = normalizedEmail;
            user.RoleId = dto.RoleId;
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "User updated successfully."
            });
        }

        [HttpPut("updateUserStatus/{id:guid}")]
        public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] bool isActive)
        {
            var affectedRows = await _context.Users
                .Where(u => u.Id == id)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(u => u.IsActive, isActive)
                    .SetProperty(u => u.UpdatedAt, DateTime.UtcNow));

            if (affectedRows == 0)
            {
                return NotFound(new
                {
                    message = "User not found."
                });
            }

            return Ok(new
            {
                statusCode = 200,
                statusMessage = "User status updated successfully."
            });
        }
    }
}
