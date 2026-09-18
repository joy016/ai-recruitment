using ai_recruitment.Data;
using ai_recruitment.Features.ApplicationStatuses.Controller;
using ai_recruitment.Features.ApplicationStatuses.Dto;
using ai_recruitment.Features.ApplicationStatuses.Model;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.JobPosts.Model;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ai_recruitment.Tests.Features.ApplicationStatuses
{
    public class ApplicantStatusControllerTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static Job CreateJob(int jobId = 1)
        {
            return new Job
            {
                JobId = jobId,
                JobTitle = "Software Engineer",
                Location = "Remote",
                JobType = "Full-time",
                JobStatus = "Open",
                JobDescription = "Build things",
                Department = "Engineering",
                Qualifications = new[] { "BS in CS" },
                TechSkills = new[] { "C#" }
            };
        }

        private static Candidate CreateCandidate(
            Guid id,
            string firstName,
            string lastName,
            int jobId,
            DateTime? interviewSched)
        {
            return new Candidate
            {
                Id = id,
                EmailAddress = $"{firstName.ToLower()}@example.com",
                FirstName = firstName,
                LastName = lastName,
                PhoneNumber = "09171234567",
                YearsOfExperience = 2,
                ResumeFileName = "resume.pdf",
                Role = "Developer",
                ApplicantStatusId = 1,
                InterviewSched = interviewSched,
                JobId = jobId
            };
        }

        [Fact]
        public async Task GetStatuses_ReturnsAllStatuses_OrderedBySortOrder()
        {
            // Arrange
            await using var context = CreateContext();
            context.ApplicantStatuses.AddRange(
                new ApplicantStatus { StatusId = 1, StatusName = "Second", SortOrder = 2, IsActive = true },
                new ApplicantStatus { StatusId = 2, StatusName = "First", SortOrder = 1, IsActive = true }
            );
            await context.SaveChangesAsync();

            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetStatuses();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var statuses = okResult.Value.Should().BeAssignableTo<IEnumerable<ApplicantStatusDto>>().Subject.ToList();

            statuses.Should().HaveCount(2);
            statuses[0].StatusName.Should().Be("First");
            statuses[1].StatusName.Should().Be("Second");
        }

        [Fact]
        public async Task GetStatuses_ReturnsEmptyList_WhenNoStatusesExist()
        {
            // Arrange
            await using var context = CreateContext();
            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetStatuses();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var statuses = okResult.Value.Should().BeAssignableTo<IEnumerable<ApplicantStatusDto>>().Subject;

            statuses.Should().BeEmpty();
        }

        [Fact]
        public async Task GetStatuses_MapsAllFieldsCorrectly()
        {
            // Arrange
            await using var context = CreateContext();
            var createdAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            context.ApplicantStatuses.Add(new ApplicantStatus
            {
                StatusId = 1,
                StatusName = "Application Submitted",
                Description = "Candidate submitted application",
                Color = "#3B82F6",
                SortOrder = 1,
                IsActive = true,
                CreatedAt = createdAt
            });
            await context.SaveChangesAsync();

            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetStatuses();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var status = okResult.Value.Should().BeAssignableTo<IEnumerable<ApplicantStatusDto>>().Subject.Single();

            status.StatusId.Should().Be(1);
            status.StatusName.Should().Be("Application Submitted");
            status.Description.Should().Be("Candidate submitted application");
            status.Color.Should().Be("#3B82F6");
            status.SortOrder.Should().Be(1);
            status.IsActive.Should().BeTrue();
            status.CreatedAt.Should().Be(createdAt);
        }

        [Fact]
        public async Task GetCandidatesForInterviewToday_ReturnsOnlyCandidatesScheduledToday()
        {
            // Arrange
            await using var context = CreateContext();
            var job = CreateJob();
            context.Jobs.Add(job);

            var today = DateTime.UtcNow.Date.AddHours(10);
            var yesterday = DateTime.UtcNow.Date.AddDays(-1).AddHours(10);
            var tomorrow = DateTime.UtcNow.Date.AddDays(1).AddHours(10);

            var candidateToday = CreateCandidate(Guid.NewGuid(), "Jane", "Doe", job.JobId, today);
            var candidateYesterday = CreateCandidate(Guid.NewGuid(), "John", "Smith", job.JobId, yesterday);
            var candidateTomorrow = CreateCandidate(Guid.NewGuid(), "Jake", "Brown", job.JobId, tomorrow);

            context.Candidates.AddRange(candidateToday, candidateYesterday, candidateTomorrow);
            await context.SaveChangesAsync();

            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetCandidatesForInterviewToday();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var candidates = okResult.Value.Should().BeAssignableTo<List<CandidateForInterviewDto>>().Subject;

            candidates.Should().ContainSingle();
            candidates[0].Id.Should().Be(candidateToday.Id);
            candidates[0].FirstName.Should().Be("Jane");
            candidates[0].LastName.Should().Be("Doe");
        }

        [Fact]
        public async Task GetCandidatesForInterviewToday_ReturnsEmptyList_WhenNoInterviewsScheduledToday()
        {
            // Arrange
            await using var context = CreateContext();
            var job = CreateJob();
            context.Jobs.Add(job);

            var yesterday = DateTime.UtcNow.Date.AddDays(-1).AddHours(10);
            context.Candidates.Add(CreateCandidate(Guid.NewGuid(), "John", "Smith", job.JobId, yesterday));
            await context.SaveChangesAsync();

            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetCandidatesForInterviewToday();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var candidates = okResult.Value.Should().BeAssignableTo<List<CandidateForInterviewDto>>().Subject;

            candidates.Should().BeEmpty();
        }

        [Fact]
        public async Task GetCandidatesForInterviewToday_ExcludesCandidatesWithoutInterviewScheduled()
        {
            // Arrange
            await using var context = CreateContext();
            var job = CreateJob();
            context.Jobs.Add(job);

            context.Candidates.Add(CreateCandidate(Guid.NewGuid(), "No", "Interview", job.JobId, null));
            await context.SaveChangesAsync();

            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetCandidatesForInterviewToday();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var candidates = okResult.Value.Should().BeAssignableTo<List<CandidateForInterviewDto>>().Subject;

            candidates.Should().BeEmpty();
        }

        [Fact]
        public async Task GetCandidatesForInterviewToday_IncludesCandidateScheduledAtMidnightBoundary()
        {
            // Arrange
            await using var context = CreateContext();
            var job = CreateJob();
            context.Jobs.Add(job);

            var startOfToday = DateTime.UtcNow.Date;
            var candidate = CreateCandidate(Guid.NewGuid(), "Early", "Bird", job.JobId, startOfToday);
            context.Candidates.Add(candidate);
            await context.SaveChangesAsync();

            var controller = new ApplicantStatusController(context);

            // Act
            var result = await controller.GetCandidatesForInterviewToday();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var candidates = okResult.Value.Should().BeAssignableTo<List<CandidateForInterviewDto>>().Subject;

            candidates.Should().ContainSingle(c => c.Id == candidate.Id);
        }
    }
}
