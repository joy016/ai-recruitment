using ai_recruitment.Data;
using ai_recruitment.Features.ApplicationStatuses.Model;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Dashboard.Controller;
using ai_recruitment.Features.Dashboard.Dto;
using ai_recruitment.Features.Dashboard.Services;
using ai_recruitment.Features.JobPosts.Model;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Xunit;

namespace ai_recruitment.Tests.Features.Dashboard
{
    public class DashboardControllerAnalyticsTests
    {
        // Fixed "now" so week-boundary assertions never depend on the day the test runs.
        // 2026-11-04 03:00 UTC is 2026-11-04 11:00 in Manila - a Wednesday.
        private static readonly DateTimeOffset FixedNowUtc = new(2026, 11, 4, 3, 0, 0, TimeSpan.Zero);

        private static AppDbContext CreateContext() =>
            new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        private static DashboardController CreateController(AppDbContext context, TimeProvider? timeProvider = null) =>
            new(context, Options.Create(new DashboardOptions { TimeZoneId = "Asia/Manila" }), timeProvider ?? new FixedTimeProvider(FixedNowUtc));

        private static async Task<Job> AddJobAsync(AppDbContext context, string title)
        {
            var job = new Job
            {
                JobTitle = title,
                Location = "Remote",
                JobType = "Full-time",
                JobStatus = "Open",
                JobDescription = "desc",
                Department = "Engineering",
                Qualifications = [],
                TechSkills = [],
            };
            context.Jobs.Add(job);
            await context.SaveChangesAsync();
            return job;
        }

        private static async Task<ApplicantStatus> AddStatusAsync(AppDbContext context, int id, string name, int sortOrder)
        {
            var status = new ApplicantStatus { StatusId = id, StatusName = name, SortOrder = sortOrder, IsActive = true };
            context.ApplicantStatuses.Add(status);
            await context.SaveChangesAsync();
            return status;
        }

        private static Candidate NewCandidate(Job job, ApplicantStatus status, string? source, DateTime? createdAt = null) => new()
        {
            Id = Guid.NewGuid(),
            EmailAddress = $"{Guid.NewGuid()}@example.com",
            FirstName = "First",
            LastName = "Last",
            PhoneNumber = "09170000000",
            YearsOfExperience = 1,
            ResumeFileName = "resume.pdf",
            Role = job.JobTitle,
            ApplicantStatusId = status.StatusId,
            JobId = job.JobId,
            Job = job,
            SourcOfApplication = source,
            CreatedAt = createdAt ?? FixedNowUtc.UtcDateTime,
        };

        private static DashboardAnalyticsDto GetOkValue(IActionResult actionResult)
        {
            var ok = Assert.IsType<OkObjectResult>(actionResult);
            return Assert.IsType<DashboardAnalyticsDto>(ok.Value);
        }

        [Fact]
        public async Task GetAnalytics_OnAnEmptyDatabase_ReturnsZeroFilledShapes_WithoutThrowing()
        {
            var context = CreateContext();
            await AddStatusAsync(context, 1, "Application Submitted", 1);
            await AddStatusAsync(context, 2, "Rejected", 2);
            var controller = CreateController(context);

            var dto = GetOkValue(await controller.GetAnalytics(null, null, default));

            dto.ApplicantsBySource.Should().HaveCount(5);
            dto.ApplicantsBySource.Should().OnlyContain(s => s.Count == 0);
            dto.ApplicantsByJob.Should().BeEmpty();
            dto.ApplicantsByStatus.Should().HaveCount(2);
            dto.ApplicantsByStatus.Should().OnlyContain(s => s.Count == 0);
            dto.WeeklyApplicationVolume.Should().HaveCount(7);
            dto.WeeklyApplicationVolume.Should().OnlyContain(d => d.Count == 0);
        }

        [Fact]
        public async Task GetAnalytics_GroupsApplicantsBySource_CaseInsensitively_AndBucketsUnknownValuesAsOther()
        {
            var context = CreateContext();
            var job = await AddJobAsync(context, "Backend Developer");
            var status = await AddStatusAsync(context, 1, "Application Submitted", 1);

            context.Candidates.AddRange(
                NewCandidate(job, status, "LinkedIn"),
                NewCandidate(job, status, "linkedin"), // case-insensitive match
                NewCandidate(job, status, "Referral"),
                NewCandidate(job, status, "CareerBuilder"), // unrecognized -> Other
                NewCandidate(job, status, null)); // missing -> Other
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var dto = GetOkValue(await controller.GetAnalytics(null, null, default));

            var bySource = dto.ApplicantsBySource.ToDictionary(s => s.Label, s => s.Count);
            bySource["LinkedIn"].Should().Be(2);
            bySource["Referral"].Should().Be(1);
            bySource["Company Website"].Should().Be(0);
            bySource["JobStreet"].Should().Be(0);
            bySource["Other"].Should().Be(2);
        }

        [Fact]
        public async Task GetAnalytics_ReturnsTopSixJobsByApplicantCount_Descending()
        {
            var context = CreateContext();
            var status = await AddStatusAsync(context, 1, "Application Submitted", 1);

            // 7 jobs, so the 7th (lowest count) must be excluded from the top 6.
            for (var i = 0; i < 7; i++)
            {
                var job = await AddJobAsync(context, $"Job {i}");
                var applicantCount = 7 - i; // Job 0 has 7 applicants ... Job 6 has 1.
                for (var c = 0; c < applicantCount; c++)
                {
                    context.Candidates.Add(NewCandidate(job, status, "LinkedIn"));
                }
            }
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var dto = GetOkValue(await controller.GetAnalytics(null, null, default));

            dto.ApplicantsByJob.Should().HaveCount(6);
            dto.ApplicantsByJob.Select(j => j.JobTitle).Should().NotContain("Job 6");
            dto.ApplicantsByJob.Should().BeInDescendingOrder(j => j.Count);
            dto.ApplicantsByJob.First().JobTitle.Should().Be("Job 0");
            dto.ApplicantsByJob.First().Count.Should().Be(7);
        }

        [Fact]
        public async Task GetAnalytics_ReturnsEveryActiveStatus_ZeroFilled_InSortOrder()
        {
            var context = CreateContext();
            var job = await AddJobAsync(context, "Backend Developer");
            var applied = await AddStatusAsync(context, 1, "Application Submitted", 1);
            var rejected = await AddStatusAsync(context, 2, "Rejected", 2);
            var inactive = new ApplicantStatus { StatusId = 3, StatusName = "Archived Stage", SortOrder = 3, IsActive = false };
            context.ApplicantStatuses.Add(inactive);
            await context.SaveChangesAsync();

            context.Candidates.Add(NewCandidate(job, applied, "LinkedIn"));
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var dto = GetOkValue(await controller.GetAnalytics(null, null, default));

            dto.ApplicantsByStatus.Select(s => s.Status).Should().Equal("Application Submitted", "Rejected");
            dto.ApplicantsByStatus.First(s => s.Status == "Application Submitted").Count.Should().Be(1);
            dto.ApplicantsByStatus.First(s => s.Status == "Rejected").Count.Should().Be(0);
        }

        [Fact]
        public async Task GetAnalytics_WeeklyVolume_OnlyCountsTheCurrentMondayToSundayWeek_InTheConfiguredTimeZone()
        {
            var context = CreateContext();
            var job = await AddJobAsync(context, "Backend Developer");
            var status = await AddStatusAsync(context, 1, "Application Submitted", 1);

            var manila = TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila");
            // That week's Monday is 2026-11-02; the following Monday is 2026-11-09.
            var mondayLocal = new DateTime(2026, 11, 2, 0, 0, 0, DateTimeKind.Unspecified);
            var justBeforeMondayUtc = TimeZoneInfo.ConvertTimeToUtc(mondayLocal.AddMinutes(-1), manila);
            var mondayStartUtc = TimeZoneInfo.ConvertTimeToUtc(mondayLocal, manila);
            var wednesdayUtc = TimeZoneInfo.ConvertTimeToUtc(mondayLocal.AddDays(2).AddHours(10), manila);
            var nextMondayUtc = TimeZoneInfo.ConvertTimeToUtc(mondayLocal.AddDays(7), manila);

            context.Candidates.AddRange(
                NewCandidate(job, status, "LinkedIn", justBeforeMondayUtc), // excluded: previous week
                NewCandidate(job, status, "LinkedIn", mondayStartUtc), // included: start of week
                NewCandidate(job, status, "LinkedIn", wednesdayUtc), // included: mid-week
                NewCandidate(job, status, "LinkedIn", wednesdayUtc), // included: second one, same day
                NewCandidate(job, status, "LinkedIn", nextMondayUtc)); // excluded: next week
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var dto = GetOkValue(await controller.GetAnalytics(null, null, default));

            dto.WeeklyApplicationVolume.Should().HaveCount(7);
            dto.WeeklyApplicationVolume.Select(d => d.Day).Should().Equal("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
            dto.WeeklyApplicationVolume.First(d => d.Day == "Mon").Count.Should().Be(1);
            dto.WeeklyApplicationVolume.First(d => d.Day == "Wed").Count.Should().Be(2);
            dto.WeeklyApplicationVolume.Where(d => d.Day is not "Mon" and not "Wed").Should().OnlyContain(d => d.Count == 0);
            dto.WeeklyApplicationVolume.First(d => d.Day == "Mon").Date.Should().Be("2026-11-02");
        }

        [Fact]
        public async Task GetAnalytics_FromTo_FiltersApplicantsBySourceJobAndStatus_ButNotWeeklyVolume()
        {
            var context = CreateContext();
            var job = await AddJobAsync(context, "Backend Developer");
            var status = await AddStatusAsync(context, 1, "Application Submitted", 1);

            var inRange = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc);
            var outOfRange = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            context.Candidates.AddRange(
                NewCandidate(job, status, "LinkedIn", inRange),
                NewCandidate(job, status, "LinkedIn", outOfRange));
            await context.SaveChangesAsync();

            var controller = CreateController(context);
            var dto = GetOkValue(await controller.GetAnalytics(
                new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                default));

            dto.ApplicantsBySource.First(s => s.Label == "LinkedIn").Count.Should().Be(1);
            dto.ApplicantsByJob.Single().Count.Should().Be(1);
        }

        private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
        {
            public override DateTimeOffset GetUtcNow() => now;
        }
    }
}
