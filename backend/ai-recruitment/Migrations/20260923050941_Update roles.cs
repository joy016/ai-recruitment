using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class Updateroles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "RoleId", "CreatedAt", "Description", "IsActive", "RoleName" },
                values: new object[,]
                {
                    { 2, new DateTime(2026, 9, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Manage recruitment operations", true, "HR Admin" },
                    { 3, new DateTime(2026, 9, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Manage recruitment", true, "Recruiter" },
                    { 4, new DateTime(2026, 9, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Manage assigned jobs and candidates", true, "Hiring Manager" },
                    { 5, new DateTime(2026, 9, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Manage interviews", true, "Interviewer" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 5);
        }
    }
}
