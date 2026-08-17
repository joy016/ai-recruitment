using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApplicantStatuses",
                columns: table => new
                {
                    StatusId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StatusName = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Color = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicantStatuses", x => x.StatusId);
                });

            migrationBuilder.CreateTable(
                name: "Applicants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EmailAddress = table.Column<string>(type: "text", nullable: false),
                    FirstName = table.Column<string>(type: "text", nullable: false),
                    LastName = table.Column<string>(type: "text", nullable: false),
                    YearsOfExperience = table.Column<int>(type: "integer", nullable: false),
                    ResumeUrl = table.Column<string>(type: "text", nullable: true),
                    ApplicantStatusId = table.Column<int>(type: "integer", nullable: false),
                    InterviewSched = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Applicants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Applicants_ApplicantStatuses_ApplicantStatusId",
                        column: x => x.ApplicantStatusId,
                        principalTable: "ApplicantStatuses",
                        principalColumn: "StatusId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "ApplicantStatuses",
                columns: new[] { "StatusId", "Color", "CreatedAt", "Description", "IsActive", "SortOrder", "StatusName" },
                values: new object[,]
                {
                    { 1, "#3B82F6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate passed AI screening", true, 1, "AI Screening passed" },
                    { 2, "#8B5CF6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is scheduled for an initial interview", true, 2, "Initial Interview" },
                    { 3, "#F59E0B", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is scheduled for a technical interview", true, 3, "Technical Interview" },
                    { 4, "#F97316", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is scheduled for a final interview", true, 4, "Final Interview" },
                    { 5, "#06B6D4", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is in the job offer stage", true, 5, "Job Offer" },
                    { 6, "#6366F1", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is submitting required documents", true, 6, "Requirements Gathering" },
                    { 7, "#A855F7", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is undergoing background verification", true, 7, "Background Check" },
                    { 8, "#14B8A6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate is currently in the onboarding process", true, 8, "Onboarding" },
                    { 9, "#22C55E", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Job offer has been formally extended to the candidate", true, 9, "Offered" },
                    { 10, "#EF4444", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Candidate was rejected during the recruitment process", true, 10, "Rejected" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Applicants_ApplicantStatusId",
                table: "Applicants",
                column: "ApplicantStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_Applicants_EmailAddress",
                table: "Applicants",
                column: "EmailAddress",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Applicants");

            migrationBuilder.DropTable(
                name: "ApplicantStatuses");
        }
    }
}
