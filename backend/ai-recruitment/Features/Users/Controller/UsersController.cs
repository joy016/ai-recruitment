using ai_recruitment.Data;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Service;
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
        private const string AvatarsBucket = "avatars";
        private static readonly string[] AllowedImageContentTypes =
        {
            "image/jpeg", "image/png", "image/webp", "image/gif"
        };
        private const long MaxAvatarFileSize = 5 * 1024 * 1024; // 5MB

        private readonly AppDbContext _context;
        private readonly ISupabaseStorageService _supabaseStorageService;
        private readonly PasswordHasher<Model.User> _passwordHasher = new();

        public UsersController(AppDbContext context, ISupabaseStorageService supabaseStorageService)
        {
            _context = context;
            _supabaseStorageService = supabaseStorageService;
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

            var roleExists = await _context.Roles
                .AnyAsync(r => r.RoleId == dto.RoleId);

            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "The specified role does not exist."
                });
            }

            // Generate Employee ID: EMP-EL123456
            if (string.IsNullOrWhiteSpace(dto.FirstName) ||
                string.IsNullOrWhiteSpace(dto.LastName))
            {
                return BadRequest(new
                {
                    message = "First name and last name are required."
                });
            }

            string initials =
                $"{char.ToUpperInvariant(dto.FirstName.Trim()[0])}" +
                $"{char.ToUpperInvariant(dto.LastName.Trim()[0])}";

            string employeeId;
            bool employeeIdExists;

            do
            {
                int randomNumber = Random.Shared.Next(100000, 1000000);

                employeeId = $"EMP-{initials}{randomNumber}";

                employeeIdExists = await _context.Users
                    .AnyAsync(u => u.EmployeeNumber == employeeId);

            } while (employeeIdExists);

            var user = new Model.User
            {
                EmployeeNumber = employeeId,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = normalizedEmail,
                InsertedBy = dto.InsertedBy,
                RoleId = dto.RoleId,
                DepartmentId = dto.DepartmentId,
            };

            user.PasswordHash = _passwordHasher
                .HashPassword(user, dto.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                StatusMessage = "User Successfully Inserted",
                StatusCode = 200,
                EmployeeId = employeeId
            });
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
                    DepartmentName = u.Department != null ? u.Department.DepartmentName : null,
                    PhoneNumber = u.PhoneNumber,
                    EmployeeNumber = u.EmployeeNumber,
                    ProfilePictureUrl = u.ProfilePictureUrl
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
                    DepartmentName = u.Department != null ? u.Department.DepartmentName : null,
                    PhoneNumber = u.PhoneNumber,
                    EmployeeNumber = u.EmployeeNumber,
                    ProfilePictureUrl = u.ProfilePictureUrl
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

        [HttpPost("uploadProfilePicture/{id:guid}")]
        public async Task<IActionResult> UploadProfilePicture(Guid id, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "A profile picture file is required." });
            }

            if (file.Length > MaxAvatarFileSize)
            {
                return BadRequest(new { message = "Profile picture file size cannot exceed 5MB." });
            }

            if (!AllowedImageContentTypes.Contains(file.ContentType))
            {
                return BadRequest(new { message = "Profile picture must be a JPEG, PNG, WEBP, or GIF image." });
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            var extension = Path.GetExtension(file.FileName);
            var path = $"{id}{extension}";

            string photoUrl;
            await using (var stream = file.OpenReadStream())
            {
                photoUrl = await _supabaseStorageService.UploadAsync(AvatarsBucket, path, stream, file.ContentType);
            }

            user.UpdatedAt = DateTime.UtcNow;
            // Cache-bust: the storage path is stable across re-uploads (same extension
            // overwrites via upsert), so without this browsers keep showing the old image.
            photoUrl = $"{photoUrl}?v={user.UpdatedAt.Value.Ticks}";
            user.ProfilePictureUrl = photoUrl;
            await _context.SaveChangesAsync();

            return Ok(new { photoUrl });
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

        [HttpPut("updatePhoneNumber/{id:guid}")]
        public async Task<IActionResult> UpdateUserPhoneNumber(Guid id, [FromBody] UpdatePhoneNumberDto dto)
        {
            var affectedRows = await _context.Users
                .Where (u => u.Id == id)
                .ExecuteUpdateAsync(setters => setters
                .SetProperty(u => u.PhoneNumber, dto.PhoneNumber));


            return Ok(new
            {
                statusCode = 200,
                statusMessage = "User phoneNumber updated successfully."
            });
        }

    }
}
