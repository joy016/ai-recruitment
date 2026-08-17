using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class Updateapplicantstatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ApplicantStatus",
                table: "Candidates",
                newName: "ApplicantStatusId");

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 1,
                columns: new[] { "Description", "StatusName" },
                values: new object[] { "Candidate submitted application", "Application Submitted" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 2,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#3B82F6", "Candidate passed AI screening", "AI Screening passed" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 3,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#8B5CF6", "Candidate is scheduled for an initial interview", "Initial Interview" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 4,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#F59E0B", "Candidate is scheduled for a technical interview", "Technical Interview" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 5,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#F97316", "Candidate is scheduled for a final interview", "Final Interview" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 6,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#06B6D4", "Candidate is in the job offer stage", "Job Offer" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 7,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#6366F1", "Candidate is submitting required documents", 6, "Requirements Gathering" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 8,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#A855F7", "Candidate is undergoing background verification", 7, "Background Check" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 9,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#14B8A6", "Candidate is currently in the onboarding process", 8, "Onboarding" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 10,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#22C55E", "Job offer has been formally extended to the candidate", 9, "Offered" });

            migrationBuilder.InsertData(
                table: "ApplicantStatuses",
                columns: new[] { "StatusId", "Color", "CreatedAt", "Description", "IsActive", "SortOrder", "StatusName" },
                values: new object[] { 11, "#EF4444", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate was rejected during the recruitment process", true, 10, "Rejected" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 11);

            migrationBuilder.RenameColumn(
                name: "ApplicantStatusId",
                table: "Candidates",
                newName: "ApplicantStatus");

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 1,
                columns: new[] { "Description", "StatusName" },
                values: new object[] { "Candidate passed AI screening", "AI Screening passed" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 2,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#8B5CF6", "Candidate is scheduled for an initial interview", "Initial Interview" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 3,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#F59E0B", "Candidate is scheduled for a technical interview", "Technical Interview" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 4,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#F97316", "Candidate is scheduled for a final interview", "Final Interview" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 5,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#06B6D4", "Candidate is in the job offer stage", "Job Offer" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 6,
                columns: new[] { "Color", "Description", "StatusName" },
                values: new object[] { "#6366F1", "Candidate is submitting required documents", "Requirements Gathering" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 7,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#A855F7", "Candidate is undergoing background verification", 7, "Background Check" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 8,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#14B8A6", "Candidate is currently in the onboarding process", 8, "Onboarding" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 9,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#22C55E", "Job offer has been formally extended to the candidate", 9, "Offered" });

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 10,
                columns: new[] { "Color", "Description", "SortOrder", "StatusName" },
                values: new object[] { "#EF4444", "Candidate was rejected during the recruitment process", 10, "Rejected" });
        }
    }
}
