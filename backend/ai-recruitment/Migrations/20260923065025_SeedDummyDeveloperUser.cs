using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class SeedDummyDeveloperUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "Email", "FirstName", "InsertedBy", "IsActive", "LastLoginAt", "LastName", "PasswordHash", "ResetPasswordTokenExpiresAt", "ResetPasswordTokenHash", "RoleId", "UpdatedAt" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), new DateTime(2026, 9, 23, 0, 0, 0, 0, DateTimeKind.Utc), "joy.developer@ai-recruitment.local", "Joy", "system-seed", true, null, "Developer", "AQAAAAIAAYagAAAAEHb035DN5pLtuO1dVDNZTkfNqoC0gQUxuDSZCH77VZCZmE++KPA/vrqv+JEjfUmXTg==", null, null, 1, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));
        }
    }
}
