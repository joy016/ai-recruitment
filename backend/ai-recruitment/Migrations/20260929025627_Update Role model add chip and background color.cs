using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRolemodeladdchipandbackgroundcolor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BackgroundColor",
                table: "Roles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChipColor",
                table: "Roles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 1,
                columns: new[] { "BackgroundColor", "ChipColor" },
                values: new object[] { "#F3E8FB", "#7B2FB0" });

            migrationBuilder.UpdateData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 2,
                columns: new[] { "BackgroundColor", "ChipColor" },
                values: new object[] { "#EFF6FF", "#2563EB" });

            migrationBuilder.UpdateData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 3,
                columns: new[] { "BackgroundColor", "ChipColor" },
                values: new object[] { "#ECFDF5", "#0F766E" });

            migrationBuilder.UpdateData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 4,
                columns: new[] { "BackgroundColor", "ChipColor" },
                values: new object[] { "#FFF7ED", "#D97706" });

            migrationBuilder.UpdateData(
                table: "Roles",
                keyColumn: "RoleId",
                keyValue: 5,
                columns: new[] { "BackgroundColor", "ChipColor" },
                values: new object[] { "#FDF2F8", "#DB2777" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackgroundColor",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "ChipColor",
                table: "Roles");
        }
    }
}
