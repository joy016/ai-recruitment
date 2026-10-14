using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ai_recruitment.Migrations
{
    /// <inheritdoc />
    public partial class BackfillPasswordSetupCompletedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The previous migration (AddUserInvitations) added PasswordSetupCompletedAt as
            // NULL for every pre-existing row, since the column didn't exist before. Any
            // account that already had a real password before the invitation feature shipped
            // is "legitimately activated" and must not be treated as pending. Accounts with no
            // password (PasswordHash empty/null) are genuinely new/pending and must stay NULL.
            // Scoped to PasswordSetupCompletedAt IS NULL, so re-running this migration (or
            // applying it a second time by mistake) is a no-op on rows it already fixed.
            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "PasswordSetupCompletedAt" = COALESCE("UpdatedAt", "CreatedAt")
                WHERE "PasswordSetupCompletedAt" IS NULL
                  AND "PasswordHash" IS NOT NULL
                  AND "PasswordHash" <> '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally not reversed: rolling back would re-lock out every account this
            // backfilled, which is never the right response to "undo this migration" (the data
            // it corrected - pre-existing real passwords - isn't something the Down migration
            // should be able to re-break).
        }
    }
}
