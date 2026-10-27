using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicantScreeningAndOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApplicantScreenings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<int>(type: "integer", nullable: false),
                    QualificationScore = table.Column<int>(type: "integer", nullable: true),
                    MatchedSkills = table.Column<string[]>(type: "text[]", nullable: false),
                    MissingSkills = table.Column<string[]>(type: "text[]", nullable: false),
                    Recommendation = table.Column<string>(type: "text", nullable: true),
                    Summary = table.Column<string>(type: "text", nullable: true),
                    ScreeningStatus = table.Column<string>(type: "text", nullable: false),
                    ScreenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicantScreenings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApplicantScreenings_Candidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "Candidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApplicantScreenings_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "JobId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ScreeningWebhookOutboxEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<int>(type: "integer", nullable: false),
                    Payload = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    ClaimedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextAttemptAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScreeningWebhookOutboxEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicantScreenings_CandidateId",
                table: "ApplicantScreenings",
                column: "CandidateId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ApplicantScreenings_JobId",
                table: "ApplicantScreenings",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_ScreeningWebhookOutboxEntries_Status_NextAttemptAt",
                table: "ScreeningWebhookOutboxEntries",
                columns: new[] { "Status", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicantScreenings");

            migrationBuilder.DropTable(
                name: "ScreeningWebhookOutboxEntries");
        }
    }
}
