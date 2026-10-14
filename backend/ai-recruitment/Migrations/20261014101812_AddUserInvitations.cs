using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddUserInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordSetupCompletedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            // Existing accounts already have a password, so mark their setup as complete;
            // otherwise login would reject every user created before invitations existed.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"PasswordSetupCompletedAt\" = \"CreatedAt\" " +
                "WHERE \"PasswordSetupCompletedAt\" IS NULL AND COALESCE(\"PasswordHash\", '') <> '';");

            migrationBuilder.CreateTable(
                name: "UserInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InvalidatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveryStatus = table.Column<int>(type: "integer", nullable: false),
                    DeliveryAttemptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveryError = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserInvitations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "PasswordSetupCompletedAt",
                value: new DateTime(2026, 9, 23, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.CreateIndex(
                name: "IX_UserInvitations_TokenHash",
                table: "UserInvitations",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserInvitations_UserId",
                table: "UserInvitations",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserInvitations");

            migrationBuilder.DropColumn(
                name: "PasswordSetupCompletedAt",
                table: "Users");
        }
    }
}
