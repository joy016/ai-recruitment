/**
 * Preset swatches offered by the role color picker. Kept as one constant so the
 * palette is easy to change in one place.
 */
export const ROLE_COLOR_PRESETS = [
  "#2E86C1", // blue
  "#17A589", // teal
  "#28B463", // green
  "#D4AC0D", // gold
  "#E67E22", // orange
  "#E74C3C", // red
  "#C2185B", // pink
  "#8E44AD", // purple
  "#5D6D7E", // slate
  "#1B4F72", // navy
] as const;

/** Must match the backend's RoleColorDefaults.DefaultChipColor. */
export const DEFAULT_ROLE_CHIP_COLOR: string = ROLE_COLOR_PRESETS[0];

/**
 * Must match what the backend's RoleColorDefaults.DeriveBackgroundColor(DefaultChipColor)
 * produces, so a role rendered before its real color loads (or with a missing color in an
 * older cached response) still looks like every other role instead of breaking.
 */
export const DEFAULT_ROLE_CHIP_BACKGROUND = "#E6F0F8";

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const isValidHexColor = (value: string): boolean =>
  HEX_COLOR_PATTERN.test(value.trim());

export const normalizeHexColor = (value: string): string =>
  value.trim().toUpperCase();

/** White or near-black text, whichever reads better against this hex background. */
export const getReadableTextColor = (hex: string): string => {
  if (!isValidHexColor(hex)) return "#FFFFFF";

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Standard perceived-brightness (YIQ) formula.
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#1A1A1A" : "#FFFFFF";
};

export type RoleChipColors = { chipColor?: string | null; backgroundColor?: string | null };

/** A role's chip style, falling back to the default colors if either is missing. */
export const getRoleChipStyle = (role: RoleChipColors) => ({
  color: role.chipColor || DEFAULT_ROLE_CHIP_COLOR,
  backgroundColor: role.backgroundColor || DEFAULT_ROLE_CHIP_BACKGROUND,
});
