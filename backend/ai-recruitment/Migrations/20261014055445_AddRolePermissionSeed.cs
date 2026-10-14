using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class AddRolePermissionSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "PermissionId", "CreatedAt", "Description", "PermissionName", "RoleId" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.view", 1 },
                    { 2, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.create", 1 },
                    { 3, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.edit", 1 },
                    { 4, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.delete", 1 },
                    { 5, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.view", 1 },
                    { 6, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.create", 1 },
                    { 7, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.edit", 1 },
                    { 8, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.delete", 1 },
                    { 9, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.view", 1 },
                    { 10, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.schedule", 1 },
                    { 11, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.reschedule", 1 },
                    { 12, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "accounts.view", 1 },
                    { 13, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "accounts.manage", 1 },
                    { 14, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "settings.view", 1 },
                    { 15, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "settings.manageSystemSettings", 1 },
                    { 16, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.view", 2 },
                    { 17, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.create", 2 },
                    { 18, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.edit", 2 },
                    { 19, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.delete", 2 },
                    { 20, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.view", 2 },
                    { 21, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.create", 2 },
                    { 22, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.edit", 2 },
                    { 23, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.view", 2 },
                    { 24, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.schedule", 2 },
                    { 25, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.reschedule", 2 },
                    { 26, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "settings.view", 2 },
                    { 27, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.view", 3 },
                    { 28, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.create", 3 },
                    { 29, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.edit", 3 },
                    { 30, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.view", 3 },
                    { 31, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.view", 3 },
                    { 32, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.schedule", 3 },
                    { 33, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.reschedule", 3 },
                    { 34, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.view", 4 },
                    { 35, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.view", 4 },
                    { 36, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.create", 4 },
                    { 37, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "jobposts.edit", 4 },
                    { 38, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.view", 4 },
                    { 39, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "candidates.view", 5 },
                    { 40, new DateTime(2026, 10, 14, 0, 0, 0, 0, DateTimeKind.Utc), null, "interviews.view", 5 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 29);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 30);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 31);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 32);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 33);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 34);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 35);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 36);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 37);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 38);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 39);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 40);
        }
    }
}
