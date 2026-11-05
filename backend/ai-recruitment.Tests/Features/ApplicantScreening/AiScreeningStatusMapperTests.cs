using ai_recruitment.Features.ApplicantScreening.Services;
using FluentAssertions;
using Xunit;

namespace ai_recruitment.Tests.Features.ApplicantScreening
{
    public class AiScreeningStatusMapperTests
    {
        [Fact]
        public void Map_CompletedPassNotRequiringReview_ReturnsAiScreeningPassed()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map("COMPLETED", "PASS", false);

            statusName.Should().Be("AI Screening passed");
            reason.Should().BeNull();
        }

        [Fact]
        public void Map_CompletedFailRequiringReview_ReturnsManualReviewWithRejectReason()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map("COMPLETED", "FAIL", true);

            statusName.Should().Be("Manual Review");
            reason.Should().Be("AI recommends rejection - please confirm");
        }

        [Fact]
        public void Map_ManualReviewRequired_ReturnsManualReviewWithBorderlineReason()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map("MANUAL_REVIEW_REQUIRED", "MANUAL_REVIEW", true);

            statusName.Should().Be("Manual Review");
            reason.Should().Be("Borderline or unverified information");
        }

        [Fact]
        public void Map_UnreadableResume_ReturnsManualReviewWithUnreadableReason()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map("UNREADABLE_RESUME", "MANUAL_REVIEW", true);

            statusName.Should().Be("Manual Review");
            reason.Should().Be("Resume could not be read - check the file");
        }

        [Fact]
        public void Map_NullValues_FallsBackToManualReview()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map(null, null, null);

            statusName.Should().Be("Manual Review");
            reason.Should().NotBeNullOrWhiteSpace();
        }

        [Fact]
        public void Map_UnknownScreeningStatus_FallsBackToManualReview()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map("SOMETHING_ELSE", "PASS", false);

            statusName.Should().Be("Manual Review");
            reason.Should().NotBeNullOrWhiteSpace();
        }

        [Fact]
        public void Map_ContradictoryPassWithRequiresReviewTrue_FallsBackToManualReview()
        {
            var (statusName, reason) = AiScreeningStatusMapper.Map("COMPLETED", "PASS", true);

            statusName.Should().Be("Manual Review");
            reason.Should().NotBeNullOrWhiteSpace();
        }

        [Theory]
        [InlineData("Application Submitted", true)]
        [InlineData("Manual Review", true)]
        [InlineData("Initial Interview", false)]
        [InlineData("Rejected", false)]
        [InlineData(null, false)]
        public void IsEligibleForAutoUpdate_OnlyAllowsApplicationSubmittedOrManualReview(string? currentStatusName, bool expected)
        {
            AiScreeningStatusMapper.IsEligibleForAutoUpdate(currentStatusName).Should().Be(expected);
        }
    }
}
