using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddInboxN8nNotifyColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "N8nNotifiedAt",
                table: "EmailMessages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "N8nSyncFailed",
                table: "EmailMessages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_EmailMessages_Direction_N8nNotifiedAt_NextAttemptAt",
                table: "EmailMessages",
                columns: new[] { "Direction", "N8nNotifiedAt", "NextAttemptAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EmailMessages_Direction_N8nNotifiedAt_NextAttemptAt",
                table: "EmailMessages");

            migrationBuilder.DropColumn(
                name: "N8nNotifiedAt",
                table: "EmailMessages");

            migrationBuilder.DropColumn(
                name: "N8nSyncFailed",
                table: "EmailMessages");
        }
    }
}
