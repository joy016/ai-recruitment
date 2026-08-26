using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class addonetomanyrelationshipinjobmodel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "JobId",
                table: "Candidates",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_JobId",
                table: "Candidates",
                column: "JobId");

            migrationBuilder.AddForeignKey(
                name: "FK_Candidates_Jobs_JobId",
                table: "Candidates",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "JobId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Candidates_Jobs_JobId",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_JobId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "Candidates");
        }
    }
}
