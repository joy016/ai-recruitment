using System.Text.RegularExpressions;

namespace ai_recruitment.Features.Roles
{
    // Single source of truth for a role's chip color: the accepted "#RRGGBB" format, the
    // fallback used when none is supplied, and how the pale chip background is derived from
    // it. Role.ChipColor/BackgroundColor are both NOT NULL columns, so every insert/edit must
    // resolve both through here rather than leaving either null.
    public static class RoleColorDefaults
    {
        public const string DefaultChipColor = "#2E86C1";
        public const string HexColorPattern = "^#[0-9A-Fa-f]{6}$";

        private static readonly Regex HexColorRegex = new(HexColorPattern, RegexOptions.Compiled);

        public static bool IsValidHex(string value) => HexColorRegex.IsMatch(value);

        public static string Normalize(string value) => value.ToUpperInvariant();

        // Blends the chip color toward white for the pale background fill shown behind it,
        // matching the style of the seeded roles (e.g. ChipColor #7B2FB0 -> Background #F3E8FB).
        public static string DeriveBackgroundColor(string chipColorHex)
        {
            const double tint = 0.88;

            var r = Convert.ToInt32(chipColorHex.Substring(1, 2), 16);
            var g = Convert.ToInt32(chipColorHex.Substring(3, 2), 16);
            var b = Convert.ToInt32(chipColorHex.Substring(5, 2), 16);

            string Blend(int channel) =>
                ((int)Math.Round(channel + (255 - channel) * tint)).ToString("X2");

            return $"#{Blend(r)}{Blend(g)}{Blend(b)}";
        }
    }
}
