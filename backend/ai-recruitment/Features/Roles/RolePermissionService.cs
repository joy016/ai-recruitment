using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Permissions.Model;
using ai_recruitment.Features.Roles.Dto;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace ai_recruitment.Features.Roles
{
    // Writes against the existing Permission table (RoleId + PermissionName per grant),
    // which already behaves as the Role <-> permission-name assignment store. See
    // PermissionSeedData/PermissionNames for why no separate Permissions catalog or
    // RolePermissions junction table was introduced for this feature.
    public class RolePermissionService : IRolePermissionService
    {
        // Canonicalizes a submitted name (case-insensitive) to the exact constant value,
        // and doubles as the "is this a known permission" check.
        private static readonly IReadOnlyDictionary<string, string> CanonicalPermissionNames =
            PermissionNames.All.ToDictionary(p => p, p => p, StringComparer.OrdinalIgnoreCase);

        private readonly AppDbContext _context;
        private readonly IPermissionService _permissionService;

        public RolePermissionService(AppDbContext context, IPermissionService permissionService)
        {
            _context = context;
            _permissionService = permissionService;
        }

        public async Task<RolePermissionsDto?> GetRolePermissionsAsync(int roleId)
        {
            var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.RoleId == roleId);
            if (role == null)
            {
                return null;
            }

            return await BuildDtoAsync(role.RoleId, role.RoleName);
        }

        public async Task<RolePermissionOperationResult> AssignPermissionAsync(int roleId, string permissionName)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
            if (role == null)
            {
                return RolePermissionOperationResult.Fail(RolePermissionOutcome.RoleNotFound, "Role not found.");
            }

            if (!CanonicalPermissionNames.TryGetValue(permissionName, out var canonicalName))
            {
                return RolePermissionOperationResult.Fail(
                    RolePermissionOutcome.InvalidPermissionNames,
                    $"'{permissionName}' is not a recognized permission.",
                    new[] { permissionName });
            }

            var alreadyAssigned = await _context.Permissions
                .AnyAsync(p => p.RoleId == roleId && p.PermissionName == canonicalName);

            if (!alreadyAssigned)
            {
                _context.Permissions.Add(new Permission
                {
                    PermissionName = canonicalName,
                    RoleId = roleId,
                    CreatedAt = DateTime.UtcNow,
                });

                await _context.SaveChangesAsync();
                _permissionService.InvalidateRoleCache(role.RoleName);
            }

            return RolePermissionOperationResult.Success(await BuildDtoAsync(role.RoleId, role.RoleName));
        }

        public async Task<RolePermissionOperationResult> RemovePermissionAsync(int roleId, string permissionName)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
            if (role == null)
            {
                return RolePermissionOperationResult.Fail(RolePermissionOutcome.RoleNotFound, "Role not found.");
            }

            if (!CanonicalPermissionNames.TryGetValue(permissionName, out var canonicalName))
            {
                return RolePermissionOperationResult.Fail(
                    RolePermissionOutcome.InvalidPermissionNames,
                    $"'{permissionName}' is not a recognized permission.",
                    new[] { permissionName });
            }

            var assignment = await _context.Permissions
                .FirstOrDefaultAsync(p => p.RoleId == roleId && p.PermissionName == canonicalName);

            if (assignment == null)
            {
                return RolePermissionOperationResult.Fail(
                    RolePermissionOutcome.AssignmentNotFound,
                    $"Role '{role.RoleName}' does not have '{canonicalName}' assigned.");
            }

            if (canonicalName == PermissionNames.Accounts.Manage)
            {
                var guard = await EnsureNotLastAdministrativeAccessAsync(roleId);
                if (guard != null)
                {
                    return guard;
                }
            }

            _context.Permissions.Remove(assignment);
            await _context.SaveChangesAsync();
            _permissionService.InvalidateRoleCache(role.RoleName);

            return RolePermissionOperationResult.Success(await BuildDtoAsync(role.RoleId, role.RoleName));
        }

        public async Task<RolePermissionOperationResult> SetRolePermissionsAsync(
            int roleId,
            IReadOnlyCollection<string> permissionNames)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
            if (role == null)
            {
                return RolePermissionOperationResult.Fail(RolePermissionOutcome.RoleNotFound, "Role not found.");
            }

            var invalid = new List<string>();
            var desired = new HashSet<string>(StringComparer.Ordinal);

            foreach (var name in permissionNames.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (CanonicalPermissionNames.TryGetValue(name, out var canonicalName))
                {
                    desired.Add(canonicalName);
                }
                else
                {
                    invalid.Add(name);
                }
            }

            if (invalid.Count > 0)
            {
                return RolePermissionOperationResult.Fail(
                    RolePermissionOutcome.InvalidPermissionNames,
                    "One or more permission names are not recognized.",
                    invalid);
            }

            var existing = await _context.Permissions.Where(p => p.RoleId == roleId).ToListAsync();
            var existingNames = existing.Select(p => p.PermissionName).ToHashSet(StringComparer.Ordinal);

            var toRemove = existing.Where(p => !desired.Contains(p.PermissionName)).ToList();
            var toAdd = desired.Where(name => !existingNames.Contains(name)).ToList();

            if (toRemove.Any(p => p.PermissionName == PermissionNames.Accounts.Manage))
            {
                var guard = await EnsureNotLastAdministrativeAccessAsync(roleId);
                if (guard != null)
                {
                    return guard;
                }
            }

            // The in-memory provider (used by tests) doesn't support real transactions;
            // IsRelational() is false there, so this becomes a plain SaveChangesAsync.
            IDbContextTransaction? transaction = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync()
                : null;

            try
            {
                if (toRemove.Count > 0)
                {
                    _context.Permissions.RemoveRange(toRemove);
                }

                if (toAdd.Count > 0)
                {
                    _context.Permissions.AddRange(toAdd.Select(name => new Permission
                    {
                        PermissionName = name,
                        RoleId = roleId,
                        CreatedAt = DateTime.UtcNow,
                    }));
                }

                await _context.SaveChangesAsync();

                if (transaction != null)
                {
                    await transaction.CommitAsync();
                }
            }
            catch
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync();
                }

                throw;
            }
            finally
            {
                if (transaction != null)
                {
                    await transaction.DisposeAsync();
                }
            }

            _permissionService.InvalidateRoleCache(role.RoleName);

            return RolePermissionOperationResult.Success(await BuildDtoAsync(role.RoleId, role.RoleName));
        }

        // Guards against a change leaving no role in the system with administrative access
        // (the ability to manage roles/permissions/accounts), e.g. accidentally unchecking
        // "Manage Accounts" for the only role that has it.
        private async Task<RolePermissionOperationResult?> EnsureNotLastAdministrativeAccessAsync(int roleIdBeingModified)
        {
            var holderRoleIds = await _context.Permissions
                .Where(p => p.PermissionName == PermissionNames.Accounts.Manage)
                .Select(p => p.RoleId)
                .Distinct()
                .ToListAsync();

            var otherHolders = holderRoleIds.Where(id => id != roleIdBeingModified);

            if (!otherHolders.Any())
            {
                return RolePermissionOperationResult.Fail(
                    RolePermissionOutcome.WouldRemoveLastAdministrativeAccess,
                    $"Cannot remove '{PermissionNames.Accounts.Manage}' - at least one role must retain administrative access.");
            }

            return null;
        }

        private async Task<RolePermissionsDto> BuildDtoAsync(int roleId, string roleName)
        {
            var permissions = await _context.Permissions
                .AsNoTracking()
                .Where(p => p.RoleId == roleId)
                .Select(p => p.PermissionName)
                .OrderBy(p => p)
                .ToListAsync();

            return new RolePermissionsDto
            {
                RoleId = roleId,
                RoleName = roleName,
                Permissions = permissions,
            };
        }
    }
}
