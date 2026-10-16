using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Users.Dto;
using ai_recruitment.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
        private readonly IUserInvitationService _invitationService;
        private readonly PasswordHasher<Model.User> _passwordHasher = new();

        public UsersController(
            AppDbContext context,
            ISupabaseStorageService supabaseStorageService,
            IUserInvitationService invitationService)
        {
            _context = context;
            _supabaseStorageService = supabaseStorageService;
            _invitationService = invitationService;
        }


        /// <summary>Creates a pending-activation account and sends its one-time invitation via n8n.</summary>
        /// <remarks>
        /// No password is accepted or generated here. The account is created with an empty
        /// PasswordHash and PasswordSetupCompletedAt = null (so it cannot log in), a 24-hour
        /// single-use invitation token is issued, and the invitation link is handed to the
        /// n8n webhook for emailing.
        ///
        /// Sample request:
        ///
        ///     { "firstName": "Jane", "lastName": "Doe", "email": "doe.jane@company.com", "insertedBy": "hr.admin@company.com", "roleId": 3, "departmentId": 1 }
        ///
        /// Sample response (200):
        ///
        ///     { "statusMessage": "User created. An activation invitation has been sent to their email.", "statusCode": 200, "employeeId": "EMP-JD123456", "invitationEmailSent": true }
        ///
        /// invitationEmailSent = false means the user and the invitation both exist, but n8n
        /// did not accept the event - call resendInvitation to retry.
        /// </remarks>
        [HttpPost("insertUser")]
        [HasPermission(PermissionNames.Accounts.Manage)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
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

            // No password is set here: the account starts pending activation and the user
            // sets their own initial password via the emailed invitation link.
            var user = new Model.User
            {
                EmployeeNumber = employeeId,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = normalizedEmail,
                PasswordHash = string.Empty,
                InsertedBy = dto.InsertedBy,
                RoleId = dto.RoleId,
                DepartmentId = dto.DepartmentId,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var invitationEmailSent = await _invitationService.IssueInvitationAsync(user);

            return Ok(new
            {
                StatusMessage = "User created. An activation invitation has been sent to their email.",
                StatusCode = 200,
                EmployeeId = employeeId,
                InvitationEmailSent = invitationEmailSent
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
                    IsPendingActivation = u.PasswordSetupCompletedAt == null,
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
                    IsPendingActivation = u.PasswordSetupCompletedAt == null,
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

        /// <summary>Checks an invitation token without consuming it.</summary>
        /// <remarks>
        /// Anonymous: this is how the "set-password" page decides whether to show the form.
        /// Always returns 200 - an unusable token yields { "isValid": false } with a generic
        /// message, so the response can't be used to enumerate accounts.
        ///
        /// Sample response (valid):
        ///
        ///     { "isValid": true, "message": "Invitation is valid.", "email": "doe.jane@company.com", "expiresAt": "2026-10-16T10:00:00Z" }
        ///
        /// Sample response (invalid / expired / already used / revoked):
        ///
        ///     { "isValid": false, "message": "This invitation link is invalid, expired, or has already been used.", "email": null, "expiresAt": null }
        /// </remarks>
        [HttpGet("validateInvitation")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimiterPolicies.InvitationPublic)]
        [ProducesResponseType(typeof(InvitationValidationResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ValidateInvitation([FromQuery] string? token)
        {
            var result = await _invitationService.ValidateInvitationAsync(token ?? string.Empty);
            return Ok(result);
        }

        /// <summary>POST form of <see cref="ValidateInvitation"/>, kept for clients that already send the token in a body.</summary>
        [HttpPost("validateInvitation")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimiterPolicies.InvitationPublic)]
        [ProducesResponseType(typeof(InvitationValidationResultDto), StatusCodes.Status200OK)]
        public Task<IActionResult> ValidateInvitationFromBody([FromBody] ValidateInvitationDto dto) =>
            ValidateInvitation(dto.Token);

        /// <summary>Consumes an invitation token and sets the invited user's initial password.</summary>
        /// <remarks>
        /// Anonymous: reached only via the one-time emailed link. Does not issue a JWT -
        /// the user must still log in afterward through the normal flow.
        ///
        /// Sample request:
        ///
        ///     { "token": "SECURE_INVITATION_TOKEN", "newPassword": "ExamplePassword123!" }
        ///
        /// Sample response (200):
        ///
        ///     { "success": true, "message": "Password created successfully. You can now log in." }
        ///
        /// Sample response (400):
        ///
        ///     { "success": false, "message": "This invitation link is invalid, expired, or has already been used." }
        /// </remarks>
        [HttpPost("setInvitationPassword")]
        // Original route name, kept so existing clients don't break.
        [HttpPost("setInitialPassword")]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimiterPolicies.InvitationPublic)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SetInvitationPassword([FromBody] SetInitialPasswordDto dto)
        {
            var result = await _invitationService.SetInitialPasswordAsync(dto);

            return result.Outcome switch
            {
                SetInitialPasswordOutcome.Success => Ok(new { success = true, message = result.Message }),
                SetInitialPasswordOutcome.PasswordMismatch => BadRequest(new { success = false, message = result.Message }),
                SetInitialPasswordOutcome.PasswordRequirementsNotMet => BadRequest(new { success = false, message = result.Message }),
                SetInitialPasswordOutcome.WeakPassword => BadRequest(new { success = false, message = result.Message }),
                SetInitialPasswordOutcome.InvalidOrExpiredToken => BadRequest(new { success = false, message = result.Message }),
                _ => StatusCode(500, new { success = false, message = "Unexpected error." }),
            };
        }

        /// <summary>Revokes the invited user's outstanding invitation and issues a fresh one.</summary>
        /// <remarks>
        /// Requires the Accounts.Manage permission and is rate limited to 5 calls per hour
        /// per caller. Rejected with 409 for accounts that have already set their password.
        /// </remarks>
        [HttpPost("resendInvitation/{userId:guid}")]
        [HasPermission(PermissionNames.Accounts.Manage)]
        [EnableRateLimiting(RateLimiterPolicies.InvitationResend)]
        public async Task<IActionResult> ResendInvitation(Guid userId)
        {
            var result = await _invitationService.ResendInvitationAsync(userId);

            return result.Outcome switch
            {
                ResendInvitationOutcome.Success => Ok(new
                {
                    statusCode = 200,
                    statusMessage = result.Message,
                    invitationEmailSent = result.InvitationEmailSent
                }),
                ResendInvitationOutcome.UserNotFound => NotFound(new { message = result.Message }),
                ResendInvitationOutcome.UserNotPendingActivation => Conflict(new { message = result.Message }),
                _ => StatusCode(500, new { message = "Unexpected error." }),
            };
        }
    }
}
