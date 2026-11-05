using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddManualReviewStatusAndScreeningFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManualReviewReason",
                table: "ApplicantScreenings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresHumanReview",
                table: "ApplicantScreenings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 3,
                column: "SortOrder",
                value: 4);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 4,
                column: "SortOrder",
                value: 5);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 5,
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 6,
                column: "SortOrder",
                value: 7);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 7,
                column: "SortOrder",
                value: 7);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 8,
                column: "SortOrder",
                value: 8);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 9,
                column: "SortOrder",
                value: 9);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 10,
                column: "SortOrder",
                value: 10);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 11,
                column: "SortOrder",
                value: 11);

            migrationBuilder.InsertData(
                table: "ApplicantStatuses",
                columns: new[] { "StatusId", "Color", "CreatedAt", "Description", "IsActive", "SortOrder", "StatusName" },
                values: new object[] { 12, "#FBBF24", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "AI screening flagged this candidate for a recruiter to review", true, 3, "Manual Review" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 12);

            migrationBuilder.DropColumn(
                name: "ManualReviewReason",
                table: "ApplicantScreenings");

            migrationBuilder.DropColumn(
                name: "RequiresHumanReview",
                table: "ApplicantScreenings");

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 3,
                column: "SortOrder",
                value: 3);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 4,
                column: "SortOrder",
                value: 4);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 5,
                column: "SortOrder",
                value: 5);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 6,
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 7,
                column: "SortOrder",
                value: 6);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 8,
                column: "SortOrder",
                value: 7);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 9,
                column: "SortOrder",
                value: 8);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 10,
                column: "SortOrder",
                value: 9);

            migrationBuilder.UpdateData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 11,
                column: "SortOrder",
                value: 10);
        }
    }
}
