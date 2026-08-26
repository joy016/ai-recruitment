using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class RemoveApplicantsNav : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Applicant_ApplicantStatuses_ApplicantStatusStatusId",
                table: "Applicant");

            migrationBuilder.DropIndex(
                name: "IX_Applicant_ApplicantStatusStatusId",
                table: "Applicant");

            migrationBuilder.DropColumn(
                name: "ApplicantStatusStatusId",
                table: "Applicant");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ApplicantStatusStatusId",
                table: "Applicant",
                type: "integer",
                nullable: true);

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
    }
}
