using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class profilePictureColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "EmployeeNumber",
                value: "EMP-JD583921");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "EmployeeNumber",
                value: "EMP-JD-583921");
        }
    }
}
