using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddJobOfferOnboardingScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "JobOfferFacilitatorId",
                table: "Candidates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "JobOfferSched",
                table: "Candidates",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OnboardingFacilitatorId",
                table: "Candidates",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingSched",
                table: "Candidates",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_JobOfferFacilitatorId",
                table: "Candidates",
                column: "JobOfferFacilitatorId");

            migrationBuilder.CreateIndex(
                name: "IX_Candidates_OnboardingFacilitatorId",
                table: "Candidates",
                column: "OnboardingFacilitatorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Candidates_Users_JobOfferFacilitatorId",
                table: "Candidates",
                column: "JobOfferFacilitatorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Candidates_Users_OnboardingFacilitatorId",
                table: "Candidates",
                column: "OnboardingFacilitatorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Candidates_Users_JobOfferFacilitatorId",
                table: "Candidates");

            migrationBuilder.DropForeignKey(
                name: "FK_Candidates_Users_OnboardingFacilitatorId",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_JobOfferFacilitatorId",
                table: "Candidates");

            migrationBuilder.DropIndex(
                name: "IX_Candidates_OnboardingFacilitatorId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "JobOfferFacilitatorId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "JobOfferSched",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "OnboardingFacilitatorId",
                table: "Candidates");

            migrationBuilder.DropColumn(
                name: "OnboardingSched",
                table: "Candidates");
        }
    }
}
