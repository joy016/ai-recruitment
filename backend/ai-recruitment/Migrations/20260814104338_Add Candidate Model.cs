using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidateModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Applicants_ApplicantStatuses_ApplicantStatusId",
                table: "Applicants");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Applicants",
                table: "Applicants");

            migrationBuilder.DropIndex(
                name: "IX_Applicants_ApplicantStatusId",
                table: "Applicants");

            migrationBuilder.DropColumn(
                name: "ApplicantStatusId",
                table: "Applicants");

            migrationBuilder.DropColumn(
                name: "ResumeUrl",
                table: "Applicants");

            migrationBuilder.RenameTable(
                name: "Applicants",
                newName: "Applicant");

            migrationBuilder.RenameIndex(
                name: "IX_Applicants_EmailAddress",
                table: "Applicant",
                newName: "IX_Applicant_EmailAddress");

            migrationBuilder.AddColumn<string>(
                name: "ApplicantStatus",
                table: "Applicant",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ApplicantStatusStatusId",
                table: "Applicant",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResumeFileName",
                table: "Applicant",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ResumeFilePath",
                table: "Applicant",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Applicant",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Applicant",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Applicant",
                table: "Applicant",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "Candidates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailAddress = table.Column<string>(type: "text", nullable: false),
                    FirstName = table.Column<string>(type: "text", nullable: false),
                    LastName = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: false),
                    YearsOfExperience = table.Column<int>(type: "integer", nullable: false),
                    LinkedInProfile = table.Column<string>(type: "text", nullable: true),
                    CoverLetter = table.Column<string>(type: "text", nullable: true),
                    ResumeFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ResumeFilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Role = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ApplicantStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InterviewSched = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candidates", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Applicant_ApplicantStatusStatusId",
                table: "Applicant",
                column: "ApplicantStatusStatusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Applicant_ApplicantStatuses_ApplicantStatusStatusId",
                table: "Applicant",
                column: "ApplicantStatusStatusId",
                principalTable: "ApplicantStatuses",
                principalColumn: "StatusId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Applicant_ApplicantStatuses_ApplicantStatusStatusId",
                table: "Applicant");

            migrationBuilder.DropTable(
                name: "Candidates");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Applicant",
                table: "Applicant");

            migrationBuilder.DropIndex(
                name: "IX_Applicant_ApplicantStatusStatusId",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "ApplicantStatus",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "ApplicantStatusStatusId",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "ResumeFileName",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "ResumeFilePath",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Applicant");

            migrationBuilder.RenameTable(
                name: "Applicant",
                newName: "Applicants");

            migrationBuilder.RenameIndex(
                name: "IX_Applicant_EmailAddress",
                table: "Applicants",
                newName: "IX_Applicants_EmailAddress");

            migrationBuilder.AddColumn<int>(
                name: "ApplicantStatusId",
                table: "Applicants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ResumeUrl",
                table: "Applicants",
                type: "text",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Applicants",
                table: "Applicants",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_Applicants_ApplicantStatusId",
                table: "Applicants",
                column: "ApplicantStatusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Applicants_ApplicantStatuses_ApplicantStatusId",
                table: "Applicants",
                column: "ApplicantStatusId",
                principalTable: "ApplicantStatuses",
                principalColumn: "StatusId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
