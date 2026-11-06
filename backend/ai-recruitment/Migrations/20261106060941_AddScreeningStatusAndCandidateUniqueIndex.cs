using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddScreeningStatusAndCandidateUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ApplicantStatuses",
                columns: new[] { "StatusId", "Color", "CreatedAt", "Description", "IsActive", "SortOrder", "StatusName" },
                values: new object[] { 13, "#94A3B8", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Application received and awaiting AI screening", true, 1, "Screening" });

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_EmailAddress_JobId",
                table: "Candidates",
                columns: new[] { "EmailAddress", "JobId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Candidates_EmailAddress_JobId",
                table: "Candidates");

            migrationBuilder.DeleteData(
                table: "ApplicantStatuses",
                keyColumn: "StatusId",
                keyValue: 13);
        }
    }
}
