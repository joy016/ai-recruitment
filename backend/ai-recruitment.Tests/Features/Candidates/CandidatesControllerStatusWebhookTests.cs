using System.Security.Claims;
using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Services;
using ai_recruitment.Features.ApplicationStatuses.Model;
using ai_recruitment.Features.Candidates.controller;
using ai_recruitment.Features.Candidates.Dto;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Candidates.Services;
using ai_recruitment.Features.Notifications;
using ai_recruitment.Features.Notifications.Model;
using ai_recruitment.Features.JobPosts.Model;
using ai_recruitment.Service;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ai_recruitment.Tests.Features.Candidates
{
    public class CandidatesControllerStatusWebhookTests
    {
        private class FakeCandidateStatusWebhookPublisher : ICandidateStatusWebhookPublisher
        {
            public List<(Candidate Candidate, string? PreviousStatus, string NewStatus, string? ChangedBy)> Calls { get; } = new();

            public Task PublishAsync(
                Candidate candidate, string? previousStatusName, string newStatusName, string? changedBy,
                CancellationToken cancellationToken = default)
            {
                Calls.Add((candidate, previousStatusName, newStatusName, changedBy));
                return Task.CompletedTask;
            }
        }

        private class NoOpScreeningRequestPublisher : IScreeningRequestPublisher
        {
            public Task PublishAsync(Candidate candidate, CancellationToken cancellationToken = default) => Task.CompletedTask;
        }

        private class NoOpSupabaseStorageService : ISupabaseStorageService
        {
            public string ResumeBucket => "resume";
            public int ResumeSignedUrlExpirationSeconds => 900;
            public Task<string> UploadAsync(string bucket, string path, Stream content, string contentType) => Task.FromResult(string.Empty);
            public Task<string> CreateSignedUrlAsync(string bucket, string path, int expiresInSeconds) => Task.FromResult(string.Empty);
            public Task DeleteAsync(string bucket, string path) => Task.CompletedTask;
        }

        private class NoOpNotificationService : INotificationService
        {
            public Task NotifyAsync(NotificationType type, NotificationContext context, string deduplicationKey, CancellationToken cancellationToken, bool critical = false) => Task.CompletedTask;
            public Task<(IReadOnlyList<ai_recruitment.Features.Notifications.Dto.NotificationDto> Items, int TotalCount)> GetNotificationsAsync(Guid userId, int page, int pageSize, bool unreadOnly, CancellationToken cancellationToken) => Task.FromResult<(IReadOnlyList<ai_recruitment.Features.Notifications.Dto.NotificationDto>, int)>((Array.Empty<ai_recruitment.Features.Notifications.Dto.NotificationDto>(), 0));
            public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken) => Task.FromResult(0);
            public Task<bool> MarkAsReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken) => Task.FromResult(true);
            public Task<int> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken) => Task.FromResult(0);
        }

        private static async Task<(CandidatesController Controller, FakeCandidateStatusWebhookPublisher Publisher, Candidate Candidate)> CreateControllerAsync(
            int initialStatusId)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
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
                new ApplicantStatus { StatusId = 4, StatusName = "Technical Interview" },
                new ApplicantStatus { StatusId = 5, StatusName = "Final Interview" },
                new ApplicantStatus { StatusId = 6, StatusName = "Job Offer" },
                new ApplicantStatus { StatusId = 7, StatusName = "Requirements Gathering" },
                new ApplicantStatus { StatusId = 8, StatusName = "Background Check" },
                new ApplicantStatus { StatusId = 9, StatusName = "Onboarding" },
                new ApplicantStatus { StatusId = 10, StatusName = "Offered" },
                new ApplicantStatus { StatusId = 11, StatusName = "Rejected" });

            var candidate = new Candidate
            {
                Id = Guid.NewGuid(),
                EmailAddress = "oliversantos@gmail.com",
                FirstName = "Oliver",
                LastName = "Santos",
                PhoneNumber = "09170000000",
                YearsOfExperience = 3,
                ResumeFileName = "resume.pdf",
                Role = "Backend Engineer",
                ApplicantStatusId = initialStatusId,
                JobId = 1,
            };
            context.Candidates.Add(candidate);
            await context.SaveChangesAsync();

            var publisher = new FakeCandidateStatusWebhookPublisher();

            var controller = new CandidatesController(
                context,
                httpClientFactory: null!,
                configuration: null!,
                logger: NullLogger<CandidatesController>.Instance,
                screeningRequestPublisher: new NoOpScreeningRequestPublisher(),
                supabaseStorageService: new NoOpSupabaseStorageService(),
                notificationService: new NoOpNotificationService(),
                candidateStatusWebhookPublisher: publisher);

            var httpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "hr@company.com") })),
            };
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            return (controller, publisher, candidate);
        }

        [Theory]
        [InlineData(3, "Initial Interview")]
        [InlineData(4, "Technical Interview")]
        [InlineData(5, "Final Interview")]
        [InlineData(6, "Job Offer")]
        [InlineData(9, "Onboarding")]
        [InlineData(11, "Rejected")]
        public async Task UpdateCandidateStatus_TriggersWebhookPublisher_ForEachNotifiableStatus(int newStatusId, string expectedStatusName)
        {
            var (controller, publisher, candidate) = await CreateControllerAsync(initialStatusId: 1);

            await controller.UpdateCandidateStatus(new UpdateCandidateStatusDto { Id = candidate.Id, ApplicantStatusId = newStatusId });

            publisher.Calls.Should().ContainSingle();
            publisher.Calls[0].NewStatus.Should().Be(expectedStatusName);
            publisher.Calls[0].PreviousStatus.Should().Be("Application Submitted");
            publisher.Calls[0].ChangedBy.Should().Be("hr@company.com");
        }

        [Theory]
        [InlineData(1)] // Application Submitted
        [InlineData(2)] // AI Screening passed
        [InlineData(7)] // Requirements Gathering
        [InlineData(8)] // Background Check
        [InlineData(10)] // Offered - deliberately excluded
        public async Task UpdateCandidateStatus_DoesNotTriggerWebhookPublisher_ForNonNotifiableStatuses(int newStatusId)
        {
            var (controller, publisher, candidate) = await CreateControllerAsync(initialStatusId: 1 == newStatusId ? 2 : 1);

            await controller.UpdateCandidateStatus(new UpdateCandidateStatusDto { Id = candidate.Id, ApplicantStatusId = newStatusId });

            publisher.Calls.Should().BeEmpty();
        }

        [Fact]
        public async Task UpdateCandidateStatus_DoesNotTriggerWebhookPublisher_WhenStatusIsUnchanged()
        {
            var (controller, publisher, candidate) = await CreateControllerAsync(initialStatusId: 11); // already "Rejected"

            await controller.UpdateCandidateStatus(new UpdateCandidateStatusDto { Id = candidate.Id, ApplicantStatusId = 11 });

            publisher.Calls.Should().BeEmpty();
        }

        [Fact]
        public async Task UpdateCandidateStatus_DoesNotTriggerWebhookPublisher_WhenOnlyInterviewScheduleChanges()
        {
            var (controller, publisher, candidate) = await CreateControllerAsync(initialStatusId: 3); // Initial Interview

            await controller.UpdateCandidateStatus(new UpdateCandidateStatusDto
            {
                Id = candidate.Id,
                InterviewSched = DateTime.UtcNow.AddDays(1),
            });

            publisher.Calls.Should().BeEmpty("no ApplicantStatusId was supplied, so the status never changed");
        }
    }
}
