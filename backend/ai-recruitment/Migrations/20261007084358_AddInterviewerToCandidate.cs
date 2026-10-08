using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewerToCandidate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Inteviewer",
                table: "Candidates");

            migrationBuilder.AddColumn<Guid>(
                name: "InterviewerId",
                table: "Candidates",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_InterviewerId",
                table: "Candidates",
                column: "InterviewerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Candidates_Users_InterviewerId",
                table: "Candidates",
                column: "InterviewerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Candidates_Users_InterviewerId",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_InterviewerId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "InterviewerId",
                table: "Candidates");

            migrationBuilder.AddColumn<string>(
                name: "Inteviewer",
                table: "Candidates",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
