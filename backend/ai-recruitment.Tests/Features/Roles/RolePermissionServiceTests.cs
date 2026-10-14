using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Permissions;
using ai_recruitment.Features.Roles;
using ai_recruitment.Features.Roles.Model;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace ai_recruitment.Tests.Features.Roles
{
    public class RolePermissionServiceTests
    {
        private const int HrAdminRoleId = 2;
        private const int RecruiterRoleId = 3;

        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static async Task<AppDbContext> CreateSeededContextAsync()
        {
            var context = CreateContext();

            context.Roles.AddRange(
                new Role { RoleId = 1, RoleName = "Super Admin", ChipColor = "#000", BackgroundColor = "#fff" },
                new Role { RoleId = HrAdminRoleId, RoleName = "HR Admin", ChipColor = "#000", BackgroundColor = "#fff" },
                new Role { RoleId = RecruiterRoleId, RoleName = "Recruiter", ChipColor = "#000", BackgroundColor = "#fff" });

            context.Permissions.AddRange(PermissionSeedData.Build()
                .Where(p => p.RoleId == 1 || p.RoleId == HrAdminRoleId || p.RoleId == RecruiterRoleId));

            await context.SaveChangesAsync();

            return context;
        }

        private static RolePermissionService CreateService(AppDbContext context) =>
            new(context, new PermissionService(context, new MemoryCache(new MemoryCacheOptions())));

        [Fact]
        public async Task AssignPermission_AddsPermission_WhenNotAlreadyAssigned()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.AssignPermissionAsync(HrAdminRoleId, PermissionNames.Accounts.View);

            result.Succeeded.Should().BeTrue();
            result.Data!.Permissions.Should().Contain(PermissionNames.Accounts.View);
        }

        [Fact]
        public async Task RemovePermission_RemovesPermission_WhenAssigned()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.RemovePermissionAsync(HrAdminRoleId, PermissionNames.JobPosts.Edit);

            result.Succeeded.Should().BeTrue();
            result.Data!.Permissions.Should().NotContain(PermissionNames.JobPosts.Edit);
        }

        [Fact]
        public async Task AssignPermission_DoesNotDuplicate_WhenAlreadyAssigned()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.AssignPermissionAsync(HrAdminRoleId, PermissionNames.Candidates.View);

            result.Succeeded.Should().BeTrue();
            var rowCount = await context.Permissions.CountAsync(p =>
                p.RoleId == HrAdminRoleId && p.PermissionName == PermissionNames.Candidates.View);
            rowCount.Should().Be(1);
        }

        [Fact]
        public async Task RemovePermission_ReturnsAssignmentNotFound_WhenNotAssigned()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            // HR Admin never has jobposts.delete per the seeded matrix.
            var result = await service.RemovePermissionAsync(HrAdminRoleId, PermissionNames.JobPosts.Delete);

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(RolePermissionOutcome.AssignmentNotFound);
        }

        [Fact]
        public async Task SetRolePermissions_AddsAndRemoves_ToMatchSubmittedSet()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var desired = new[]
            {
                PermissionNames.Candidates.Create,
                PermissionNames.Candidates.Delete,
                PermissionNames.JobPosts.View,
                PermissionNames.JobPosts.Create,
            };

            var result = await service.SetRolePermissionsAsync(RecruiterRoleId, desired);

            result.Succeeded.Should().BeTrue();
            result.Data!.Permissions.Should().BeEquivalentTo(desired);
        }

        [Fact]
        public async Task SetRolePermissions_WithEmptyArray_RemovesAllPermissionsForRole()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.SetRolePermissionsAsync(RecruiterRoleId, Array.Empty<string>());

            result.Succeeded.Should().BeTrue();
            result.Data!.Permissions.Should().BeEmpty();
        }

        [Fact]
        public async Task SetRolePermissions_ReturnsRoleNotFound_ForNonexistentRole()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.SetRolePermissionsAsync(999, new[] { PermissionNames.Candidates.View });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(RolePermissionOutcome.RoleNotFound);
        }

        [Fact]
        public async Task SetRolePermissions_DoesNotAffectOtherRoles()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var hrAdminBefore = await service.GetRolePermissionsAsync(HrAdminRoleId);

            await service.SetRolePermissionsAsync(RecruiterRoleId, Array.Empty<string>());

            var hrAdminAfter = await service.GetRolePermissionsAsync(HrAdminRoleId);

            hrAdminAfter!.Permissions.Should().BeEquivalentTo(hrAdminBefore!.Permissions);
        }

        [Fact]
        public async Task NewRole_HasZeroPermissions_ByDefault()
        {
            await using var context = await CreateSeededContextAsync();
            context.Roles.Add(new Role { RoleId = 6, RoleName = "Brand New Role", ChipColor = "#000", BackgroundColor = "#fff" });
            await context.SaveChangesAsync();

            var service = CreateService(context);

            var result = await service.GetRolePermissionsAsync(6);

            result!.Permissions.Should().BeEmpty();
        }

        [Fact]
        public async Task SetRolePermissions_RejectsUnknownPermissionNames()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.SetRolePermissionsAsync(RecruiterRoleId, new[] { "not.a.real.permission" });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(RolePermissionOutcome.InvalidPermissionNames);
            result.InvalidPermissions.Should().Contain("not.a.real.permission");
        }

        [Fact]
        public async Task RemovePermission_Blocks_WhenItWouldRemoveLastAdministrativeAccess()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            // Only Super Admin (RoleId 1) holds accounts.manage in the seeded matrix.
            var result = await service.RemovePermissionAsync(1, PermissionNames.Accounts.Manage);

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(RolePermissionOutcome.WouldRemoveLastAdministrativeAccess);

            var stillThere = await context.Permissions.AnyAsync(p =>
                p.RoleId == 1 && p.PermissionName == PermissionNames.Accounts.Manage);
            stillThere.Should().BeTrue();
        }

        [Fact]
        public async Task SetRolePermissions_Blocks_WhenItWouldRemoveLastAdministrativeAccess()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            var result = await service.SetRolePermissionsAsync(1, new[] { PermissionNames.Candidates.View });

            result.Succeeded.Should().BeFalse();
            result.Outcome.Should().Be(RolePermissionOutcome.WouldRemoveLastAdministrativeAccess);
        }

        [Fact]
        public async Task RemovePermission_Allowed_WhenAnotherRoleStillHasAdministrativeAccess()
        {
            await using var context = await CreateSeededContextAsync();
            var service = CreateService(context);

            // Give HR Admin accounts.manage too, so Super Admin is no longer the sole holder.
            await service.AssignPermissionAsync(HrAdminRoleId, PermissionNames.Accounts.Manage);

            var result = await service.RemovePermissionAsync(1, PermissionNames.Accounts.Manage);

            result.Succeeded.Should().BeTrue();
        }
    }
}
