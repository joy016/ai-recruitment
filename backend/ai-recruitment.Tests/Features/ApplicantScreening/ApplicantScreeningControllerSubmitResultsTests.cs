using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Controller;
using ai_recruitment.Features.ApplicantScreening.Dto;
using ai_recruitment.Features.ApplicantScreening.Services;
using ai_recruitment.Features.ApplicationStatuses.Model;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Candidates.Services;
using ai_recruitment.Features.JobPosts.Model;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace ai_recruitment.Tests.Features.ApplicantScreening
{
    public class ApplicantScreeningControllerSubmitResultsTests
    {
        private const string Secret = "test-callback-secret";

        private class FakeCandidateStatusWebhookPublisher : ICandidateStatusWebhookPublisher
        {
            public int CallCount { get; private set; }

            public Task PublishAsync(
                Candidate candidate, string? previousStatusName, string newStatusName, string? changedBy,
                CancellationToken cancellationToken = default)
            {
                CallCount++;
                return Task.CompletedTask;
            }
        }

        private class FakeNotificationService : INotificationService
        {
            public List<(NotificationType Type, string DeduplicationKey)> Calls { get; } = new();

            public Task NotifyAsync(NotificationType type, NotificationContext context, string deduplicationKey, CancellationToken cancellationToken, bool critical = false)
            {
                Calls.Add((type, deduplicationKey));
                return Task.CompletedTask;
            }

            public Task<(IReadOnlyList<ai_recruitment.Features.Notifications.Dto.NotificationDto> Items, int TotalCount)> GetNotificationsAsync(Guid userId, int page, int pageSize, bool unreadOnly, CancellationToken cancellationToken) => Task.FromResult<(IReadOnlyList<ai_recruitment.Features.Notifications.Dto.NotificationDto>, int)>((Array.Empty<ai_recruitment.Features.Notifications.Dto.NotificationDto>(), 0));
            public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken) => Task.FromResult(0);
            public Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken) => Task.FromResult(true);
            public Task<int> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken) => Task.FromResult(0);
        }

        private static (ApplicantScreeningController Controller, AppDbContext Context, Candidate Candidate, FakeNotificationService Notifications) CreateController(
            int initialStatusId)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            var context = new AppDbContext(options);

            context.Jobs.Add(new Job
            {
                JobId = 1,
                JobTitle = "Backend Engineer",
                Location = "Remote",
                JobType = "Full-time",
                JobStatus = "Open",
                JobDescription = "desc",
                Department = "Engineering",
                Qualifications = Array.Empty<string>(),
                TechSkills = Array.Empty<string>(),
            });

            context.ApplicantStatuses.AddRange(
                new ApplicantStatus { StatusId = 1, StatusName = "Application Submitted" },
                new ApplicantStatus { StatusId = 2, StatusName = "AI Screening passed" },
                new ApplicantStatus { StatusId = 3, StatusName = "Initial Interview" },
                new ApplicantStatus { StatusId = 11, StatusName = "Rejected" },
                new ApplicantStatus { StatusId = 12, StatusName = "Manual Review" });

            var candidate = new Candidate
            {
                Id = Guid.NewGuid(),
                EmailAddress = "jane.doe@example.com",
                FirstName = "Jane",
                LastName = "Doe",
                PhoneNumber = "09170000000",
                YearsOfExperience = 3,
                ResumeFileName = "resume.pdf",
                Role = "Backend Engineer",
                ApplicantStatusId = initialStatusId,
                JobId = 1,
            };
            context.Candidates.Add(candidate);
            context.SaveChanges();

            var notifications = new FakeNotificationService();
            var publisher = new FakeCandidateStatusWebhookPublisher();
            var statusChangeService = new CandidateStatusChangeService(context, notifications, publisher);

            var controller = new ApplicantScreeningController(
                context,
                Options.Create(new N8nScreeningOptions
                {
                    CallbackSecret = Secret,
                    SecretHeaderName = "X-Webhook-Secret",
                }),
                notifications,
                statusChangeService,
                NullLogger<ApplicantScreeningController>.Instance);

            var httpContext = new DefaultHttpContext();
            httpContext.Request.Headers["X-Webhook-Secret"] = Secret;
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            return (controller, context, candidate, notifications);
        }

        private static SubmitScreeningResultDto BuildDto(
            Candidate candidate,
            string screeningStatus,
            string? recommendation,
            bool? requiresHumanReview,
            int? score = 80)
        {
            return new SubmitScreeningResultDto
            {
                CandidateId = candidate.Id,
                JobId = candidate.JobId,
                ScreeningStatus = screeningStatus,
                Recommendation = recommendation,
                RequiresHumanReview = requiresHumanReview,
                QualificationScore = score,
                ScreenedAt = DateTime.UtcNow,
            };
        }

        [Fact]
        public async Task SubmitResults_CompletedPass_MovesCandidateToAiScreeningPassed()
        {
            var (controller, context, candidate, _) = CreateController(initialStatusId: 1);

            var result = await controller.SubmitResults(
                BuildDto(candidate, "COMPLETED", "PASS", false), CancellationToken.None);

            result.Should().BeOfType<OkObjectResult>();
            (await context.Candidates.FindAsync(candidate.Id))!.ApplicantStatusId.Should().Be(2);
        }

        [Fact]
        public async Task SubmitResults_CompletedFail_MovesCandidateToManualReview_WithReason()
        {
            var (controller, context, candidate, _) = CreateController(initialStatusId: 1);

            await controller.SubmitResults(
                BuildDto(candidate, "COMPLETED", "FAIL", true), CancellationToken.None);

            (await context.Candidates.FindAsync(candidate.Id))!.ApplicantStatusId.Should().Be(12);
            var screening = await context.Set<ai_recruitment.Features.ApplicantScreening.Model.ApplicantScreening>()
                .FirstAsync(s => s.CandidateId == candidate.Id);
            screening.ManualReviewReason.Should().Be("AI recommends rejection - please confirm");
        }

        [Fact]
        public async Task SubmitResults_DoesNotOverwriteStatus_WhenCandidateAlreadyAdvancedByRecruiter()
        {
            var (controller, context, candidate, _) = CreateController(initialStatusId: 3);

            var result = await controller.SubmitResults(
                BuildDto(candidate, "COMPLETED", "FAIL", true), CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value!.GetType().GetProperty("statusUpdated")!.GetValue(okResult.Value).Should().Be(false);

            (await context.Candidates.FindAsync(candidate.Id))!.ApplicantStatusId.Should().Be(3);

            var screening = await context.Set<ai_recruitment.Features.ApplicantScreening.Model.ApplicantScreening>()
                .FirstOrDefaultAsync(s => s.CandidateId == candidate.Id);
            screening.Should().NotBeNull();
        }

        [Fact]
        public async Task SubmitResults_DuplicatePost_IsIdempotent()
        {
            var (controller, context, candidate, notifications) = CreateController(initialStatusId: 1);
            var dto = BuildDto(candidate, "COMPLETED", "PASS", false);

            await controller.SubmitResults(dto, CancellationToken.None);
            var firstNotifyCount = notifications.Calls.Count;

            var second = await controller.SubmitResults(dto, CancellationToken.None);

            var okResult = second.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value!.GetType().GetProperty("duplicate")!.GetValue(okResult.Value).Should().Be(true);
            notifications.Calls.Should().HaveCount(firstNotifyCount, "a byte-identical retry must not re-notify or re-change status");
            (await context.Candidates.FindAsync(candidate.Id))!.ApplicantStatusId.Should().Be(2);
        }

        [Fact]
        public async Task SubmitResults_MissingSecretHeader_ReturnsUnauthorized()
        {
            var (controller, _, candidate, _) = CreateController(initialStatusId: 1);
            controller.ControllerContext.HttpContext.Request.Headers.Remove("X-Webhook-Secret");

            var result = await controller.SubmitResults(
                BuildDto(candidate, "COMPLETED", "PASS", false), CancellationToken.None);

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task SubmitResults_CandidateNotFound_ReturnsNotFound()
        {
            var (controller, _, _, _) = CreateController(initialStatusId: 1);

            var result = await controller.SubmitResults(
                new SubmitScreeningResultDto
                {
                    CandidateId = Guid.NewGuid(),
                    JobId = 1,
                    ScreeningStatus = "COMPLETED",
                    Recommendation = "PASS",
                    RequiresHumanReview = false,
                },
                CancellationToken.None);

            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
