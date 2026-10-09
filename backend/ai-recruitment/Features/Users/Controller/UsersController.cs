using ai_recruitment.Data;
using ai_recruitment.Features.Users.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ai_recruitment.Features.Users.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly Supabase.Client _supabase;
        private readonly PasswordHasher<Model.User> _passwordHasher = new();

        public UsersController(AppDbContext context, Supabase.Client supabase)
        {
            _context = context;
            _supabase = supabase; 
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
                InsertedBy = dto.InsertedBy,
                RoleId = dto.RoleId,
                DepartmentId = dto.DepartmentId,
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(
             new
             {
                 StatusMessage = "User Successfully Inserted",
                 StatusCode = 200,
             }
            );
        }

        [HttpGet("getAllUsers")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int? roleId, [FromQuery] bool? status, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var query = _context.Users.AsNoTracking().AsQueryable();

            if (roleId.HasValue)
            {
                query = query.Where(u => u.RoleId == roleId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(u => u.IsActive == status.Value);
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
                    RoleName = u.Role.RoleName,
                    InsertedBy =u.InsertedBy,
                    DepId = u.DepartmentId,
                    DepartmentName = u.Department.DepartmentName,
                    PhoneNumber = u.PhoneNumber,
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
                    RoleName = u.Role.RoleName, 
                    InsertedBy = u.InsertedBy,
                    DepId = u.DepartmentId,
                    DepartmentName = u.Department.DepartmentName,
                    PhoneNumber = u.PhoneNumber,

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
            user.DepartmentId = dto.DepId;
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


        [HttpPost("me/photo")]
        [Authorize]
        [RequestSizeLimit(2 * 1024 * 1024)]
        public async Task<IActionResult> UploadPhoto(IFormFile file)
        {
            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };

            if (file is null || file.Length == 0)
                return BadRequest("No file provided.");
            if (file.Length > 2 * 1024 * 1024)
                return BadRequest("Max file size is 2 MB.");
            if (!allowed.Contains(file.ContentType))
                return BadRequest("Only JPEG, PNG, or WebP images are allowed.");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _context.Users.FindAsync(Guid.Parse(userId));
            if (user is null) return NotFound();

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            // Unique name per upload avoids stale browser/CDN caching
            var path = $"{userId}/{Guid.NewGuid():N}{ext}";

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var bucket = _supabase.Storage.From("avatars");
            var previousPhotoUrl = user.PhotoUrl;

            try
            {
                await bucket.Upload(ms.ToArray(), path,
                    new Supabase.Storage.FileOptions { ContentType = file.ContentType });
            }
            catch (Supabase.Storage.Exceptions.SupabaseStorageException ex)
            {
                return StatusCode(502, new { message = $"Photo upload failed: {ex.Message}" });
            }

            user.PhotoUrl = bucket.GetPublicUrl(path);
            await _context.SaveChangesAsync();

            // Clean up the old photo; a failure here shouldn't fail the request
            // since the new photo is already uploaded and saved.
            if (!string.IsNullOrEmpty(previousPhotoUrl))
            {
                var marker = "/avatars/";
                var idx = previousPhotoUrl.IndexOf(marker, StringComparison.Ordinal);
                if (idx >= 0)
                {
                    try
                    {
                        await bucket.Remove(previousPhotoUrl[(idx + marker.Length)..]);
                    }
                    catch (Supabase.Storage.Exceptions.SupabaseStorageException)
                    {
                        // Old file removal is best-effort; orphaned files don't affect correctness.
                    }
                }
            }

            return Ok(new { photoUrl = user.PhotoUrl });
        }
    }
}
