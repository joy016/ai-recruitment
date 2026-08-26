using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class UpdatedatatypeofapplicantStatusId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "ApplicantStatusId",
                table: "Candidates",
                type: "integer",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ApplicantStatusId",
                table: "Candidates",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldMaxLength: 100);
        }
    }
}
