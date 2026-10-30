using ai_recruitment.Features.Candidates.Services;
using FluentAssertions;
using Xunit;

namespace ai_recruitment.Tests.Features.Candidates
{
    public class CandidateStatusNotificationsTests
    {
        [Theory]
        [InlineData("Initial Interview", "interview")]
        [InlineData("Technical Interview", "interview")]
        [InlineData("Final Interview", "interview")]
        [InlineData("Job Offer", "job_offer")]
        [InlineData("Onboarding", "onboarding")]
        [InlineData("Rejected", "rejection")]
        public void TryGetEmailType_ReturnsTrue_ForEachNotifiableStatus(string statusName, string expectedEmailType)
        {
            var result = CandidateStatusNotifications.TryGetEmailType(statusName, out var emailType);

            result.Should().BeTrue();
            emailType.Should().Be(expectedEmailType);
        }

        [Theory]
        [InlineData(" initial interview ")]
        [InlineData("JOB OFFER")]
        [InlineData("rejected")]
        public void TryGetEmailType_IsCaseInsensitiveAndTrimmed(string statusName)
        {
            CandidateStatusNotifications.TryGetEmailType(statusName, out _).Should().BeTrue();
        }

        [Theory]
        [InlineData("Application Submitted")]
        [InlineData("AI Screening passed")]
        [InlineData("Requirements Gathering")]
        [InlineData("Background Check")]
        [InlineData("Offered")] // deliberately separate from "Job Offer" - confirmed not notifiable
        [InlineData("a new stage")]
        [InlineData(null)]
        [InlineData("")]
        public void TryGetEmailType_ReturnsFalse_ForNonNotifiableStatuses(string? statusName)
        {
            var result = CandidateStatusNotifications.TryGetEmailType(statusName, out var emailType);

            result.Should().BeFalse();
            emailType.Should().BeNullOrEmpty();
        }

        [Theory]
        [InlineData("Initial Interview")]
        [InlineData("Technical Interview")]
        [InlineData("Final Interview")]
        public void IsInterviewStatus_ReturnsTrue_ForInterviewStatuses(string statusName)
        {
            CandidateStatusNotifications.IsInterviewStatus(statusName).Should().BeTrue();
        }

        [Theory]
        [InlineData("Job Offer")]
        [InlineData("Onboarding")]
        [InlineData("Rejected")]
        [InlineData(null)]
        public void IsInterviewStatus_ReturnsFalse_ForNonInterviewStatuses(string? statusName)
        {
            CandidateStatusNotifications.IsInterviewStatus(statusName).Should().BeFalse();
        }
    }
}
