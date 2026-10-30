using System.Text.Json;
using ai_recruitment.Data;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Candidates.Services;
using ai_recruitment.Features.JobPosts.Model;
using ai_recruitment.Features.Users.Model;
using ai_recruitment.Tests.Features.Users;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ai_recruitment.Tests.Features.Candidates
{
    public class CandidateStatusWebhookPublisherTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static readonly Guid InterviewerId = Guid.Parse("33333333-3333-3333-3333-333333333333");

        private static async Task<(AppDbContext Context, Candidate Candidate)> SeedCandidateAsync(
            DateTime? interviewSched = null, Guid? interviewerId = null)
        {
            var context = CreateContext();

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

            if (interviewerId.HasValue)
            {
                context.Users.Add(new User
                {
                    Id = interviewerId.Value,
                    FirstName = "Jane",
                    LastName = "Reviewer",
                    Email = "jane.reviewer@company.com",
                    PasswordHash = "hash",
                    InsertedBy = "seed",
                    IsActive = true,
                    PhoneNumber = "09170000001",
                    RoleId = 5,
                });
            }

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
                ApplicantStatusId = 3,
                JobId = 1,
                InterviewSched = interviewSched,
                InterviewerId = interviewerId,
            };

            context.Candidates.Add(candidate);
            await context.SaveChangesAsync();

            return (context, candidate);
        }

        [Theory]
        [InlineData("Initial Interview", "interview")]
        [InlineData("Technical Interview", "interview")]
        [InlineData("Final Interview", "interview")]
        [InlineData("Job Offer", "job_offer")]
        [InlineData("Onboarding", "onboarding")]
        [InlineData("Rejected", "rejection")]
        public async Task PublishAsync_EnqueuesOutboxRow_ForEachNotifiableStatus(string newStatus, string expectedEmailType)
        {
            var (context, candidate) = await SeedCandidateAsync(
                interviewSched: new DateTime(2026, 10, 29, 11, 13, 0, DateTimeKind.Utc),
                interviewerId: InterviewerId);
            var channel = new CandidateStatusOutboxChannel();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, NullLoggerFactory().CreateLogger<CandidateStatusWebhookPublisher>());

            await publisher.PublishAsync(candidate, "AI Screening passed", newStatus, "hr@company.com", default);

            var entries = await context.Set<CandidateStatusWebhookOutbox>().ToListAsync();
            entries.Should().ContainSingle();

            var payload = JsonDocument.Parse(entries[0].Payload).RootElement;
            payload.GetProperty("event").GetString().Should().Be("candidate.status.changed");
            payload.GetProperty("candidateId").GetGuid().Should().Be(candidate.Id);
            payload.GetProperty("firstName").GetString().Should().Be("Oliver");
            payload.GetProperty("lastName").GetString().Should().Be("Santos");
            payload.GetProperty("fullName").GetString().Should().Be("Oliver Santos");
            payload.GetProperty("email").GetString().Should().Be("oliversantos@gmail.com");
            payload.GetProperty("jobId").GetInt32().Should().Be(1);
            payload.GetProperty("jobTitle").GetString().Should().Be("Backend Engineer");
            payload.GetProperty("previousStatus").GetString().Should().Be("AI Screening passed");
            payload.GetProperty("newStatus").GetString().Should().Be(newStatus);
            payload.GetProperty("emailType").GetString().Should().Be(expectedEmailType);
            payload.GetProperty("changedBy").GetString().Should().Be("hr@company.com");

            var expectedInterviewerName = CandidateStatusNotifications.IsInterviewStatus(newStatus) ? "Jane Reviewer" : null;
            var interviewerNameProperty = payload.GetProperty("interviewerName");
            if (expectedInterviewerName is null)
            {
                interviewerNameProperty.ValueKind.Should().Be(JsonValueKind.Null);
            }
            else
            {
                interviewerNameProperty.GetString().Should().Be(expectedInterviewerName);
            }
        }

        [Theory]
        [InlineData("Application Submitted")]
        [InlineData("AI Screening passed")]
        [InlineData("Requirements Gathering")]
        [InlineData("Background Check")]
        [InlineData("Offered")]
        public async Task PublishAsync_EnqueuesNothing_ForNonNotifiableStatuses(string newStatus)
        {
            var (context, candidate) = await SeedCandidateAsync();
            var channel = new CandidateStatusOutboxChannel();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, NullLoggerFactory().CreateLogger<CandidateStatusWebhookPublisher>());

            await publisher.PublishAsync(candidate, "Application Submitted", newStatus, "hr@company.com", default);

            (await context.Set<CandidateStatusWebhookOutbox>().CountAsync()).Should().Be(0);
        }

        [Fact]
        public async Task PublishAsync_SendsNullInterviewSchedule_WhenInterviewStatusHasNoScheduleYet()
        {
            var (context, candidate) = await SeedCandidateAsync(interviewSched: null);
            var channel = new CandidateStatusOutboxChannel();
            var logger = new CapturingLogger<CandidateStatusWebhookPublisher>();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, logger);

            await publisher.PublishAsync(candidate, "AI Screening passed", "Initial Interview", "hr@company.com", default);

            var entry = await context.Set<CandidateStatusWebhookOutbox>().SingleAsync();
            var payload = JsonDocument.Parse(entry.Payload).RootElement;
            payload.GetProperty("interviewSchedule").ValueKind.Should().Be(JsonValueKind.Null);

            logger.Entries.Should().Contain(e => e.Level == LogLevel.Warning && e.Message.Contains("InterviewSched"));
        }

        [Fact]
        public async Task PublishAsync_SendsNullInterviewerName_WhenInterviewStatusHasNoInterviewerAssigned()
        {
            var (context, candidate) = await SeedCandidateAsync(
                interviewSched: new DateTime(2026, 10, 29, 11, 13, 0, DateTimeKind.Utc),
                interviewerId: null);
            var channel = new CandidateStatusOutboxChannel();
            var logger = new CapturingLogger<CandidateStatusWebhookPublisher>();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, logger);

            await publisher.PublishAsync(candidate, "AI Screening passed", "Initial Interview", "hr@company.com", default);

            var entry = await context.Set<CandidateStatusWebhookOutbox>().SingleAsync();
            var payload = JsonDocument.Parse(entry.Payload).RootElement;
            payload.GetProperty("interviewerName").ValueKind.Should().Be(JsonValueKind.Null);

            logger.Entries.Should().Contain(e => e.Level == LogLevel.Warning && e.Message.Contains("InterviewerId"));
        }

        [Fact]
        public async Task PublishAsync_IncludesInterviewSchedule_InUtcIso8601_ForInterviewStatuses()
        {
            var scheduled = new DateTime(2026, 10, 29, 11, 13, 0, DateTimeKind.Utc);
            var (context, candidate) = await SeedCandidateAsync(interviewSched: scheduled);
            var channel = new CandidateStatusOutboxChannel();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, NullLoggerFactory().CreateLogger<CandidateStatusWebhookPublisher>());

            await publisher.PublishAsync(candidate, "AI Screening passed", "Technical Interview", "hr@company.com", default);

            var entry = await context.Set<CandidateStatusWebhookOutbox>().SingleAsync();
            var payload = JsonDocument.Parse(entry.Payload).RootElement;
            payload.GetProperty("interviewSchedule").GetDateTime().Should().Be(scheduled);
        }

        [Fact]
        public async Task PublishAsync_OmitsInterviewSchedule_ForNonInterviewStatuses()
        {
            var (context, candidate) = await SeedCandidateAsync(interviewSched: new DateTime(2026, 10, 29, 11, 13, 0, DateTimeKind.Utc));
            var channel = new CandidateStatusOutboxChannel();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, NullLoggerFactory().CreateLogger<CandidateStatusWebhookPublisher>());

            await publisher.PublishAsync(candidate, "Technical Interview", "Rejected", "hr@company.com", default);

            var entry = await context.Set<CandidateStatusWebhookOutbox>().SingleAsync();
            var payload = JsonDocument.Parse(entry.Payload).RootElement;
            payload.GetProperty("interviewSchedule").ValueKind.Should().Be(JsonValueKind.Null);
        }

        [Fact]
        public async Task PublishAsync_SignalsTheOutboxChannel()
        {
            var (context, candidate) = await SeedCandidateAsync();
            var channel = new CandidateStatusOutboxChannel();
            var publisher = new CandidateStatusWebhookPublisher(context, channel, NullLoggerFactory().CreateLogger<CandidateStatusWebhookPublisher>());

            await publisher.PublishAsync(candidate, "AI Screening passed", "Rejected", "hr@company.com", default);

            channel.Reader.TryRead(out var signaledId).Should().BeTrue();
            var entry = await context.Set<CandidateStatusWebhookOutbox>().SingleAsync();
            signaledId.Should().Be(entry.Id);
        }

        private static ILoggerFactory NullLoggerFactory() => Microsoft.Extensions.Logging.Abstractions.NullLoggerFactory.Instance;
    }
}
