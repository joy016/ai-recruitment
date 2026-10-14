using System.Security.Claims;
using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Permissions;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace ai_recruitment.Tests.Features.Authorization
{
    // These exercise the same PermissionHandler + PermissionService + PermissionRequirement
    // pipeline that [HasPermission] wires into ASP.NET Core's authorization middleware, so a
    // "succeeded" result here is what lets a request through (200/204) and a "failed" result
    // is what the middleware turns into a 403 for an authenticated-but-unauthorized user.
    public class PermissionAuthorizationTests
    {
        private static AppDbContext CreateSeededContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);

            context.Roles.AddRange(
                new ai_recruitment.Features.Roles.Model.Role { RoleId = 2, RoleName = "HR Admin", ChipColor = "#000", BackgroundColor = "#fff" },
                new ai_recruitment.Features.Roles.Model.Role { RoleId = 5, RoleName = "Interviewer", ChipColor = "#000", BackgroundColor = "#fff" }
            );

            context.Permissions.AddRange(PermissionSeedData.Build()
                .Where(p => p.RoleId == 2 || p.RoleId == 5));

            context.SaveChanges();

            return context;
        }

        private static async Task<bool> EvaluateAsync(AppDbContext context, string roleName, string permission)
        {
            var permissionService = new PermissionService(context, new MemoryCache(new MemoryCacheOptions()));
            var handler = new PermissionHandler(permissionService);
            var requirement = new PermissionRequirement(permission);

            var user = new ClaimsPrincipal(new ClaimsIdentity(
                new[] { new Claim(ClaimTypes.Role, roleName) },
                authenticationType: "TestAuth"));

            var context2 = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

            await handler.HandleAsync(context2);

            return context2.HasSucceeded;
        }

        [Fact]
        public async Task HrAdmin_IsDenied_JobPostsDelete()
        {
            await using var context = CreateSeededContext();

            var succeeded = await EvaluateAsync(context, "HR Admin", PermissionNames.JobPosts.Delete);

            succeeded.Should().BeFalse("HR Admin can view/create/edit job posts but not delete them");
        }

        [Fact]
        public async Task HrAdmin_IsAllowed_CandidatesDelete()
        {
            await using var context = CreateSeededContext();

            var succeeded = await EvaluateAsync(context, "HR Admin", PermissionNames.Candidates.Delete);

            succeeded.Should().BeTrue("HR Admin has full access to candidates, including delete");
        }

        [Fact]
        public async Task Interviewer_IsDenied_CandidatesCreate()
        {
            await using var context = CreateSeededContext();

            var succeeded = await EvaluateAsync(context, "Interviewer", PermissionNames.Candidates.Create);

            succeeded.Should().BeFalse("Interviewer can only view candidates, not create them");
        }

        [Fact]
        public async Task Interviewer_IsAllowed_CandidatesView()
        {
            await using var context = CreateSeededContext();

            var succeeded = await EvaluateAsync(context, "Interviewer", PermissionNames.Candidates.View);

            succeeded.Should().BeTrue("Interviewer can view candidates");
        }

        [Fact]
        public async Task UnknownRole_IsDenied()
        {
            await using var context = CreateSeededContext();

            var succeeded = await EvaluateAsync(context, "Not A Role", PermissionNames.Candidates.View);

            succeeded.Should().BeFalse("a role with no seeded permissions has no access");
        }
    }
}
