import { Box } from "@mui/material";
import { Check, Close, PriorityHigh } from "@mui/icons-material";
import {
  FALLBACK_NOTIFICATION_ICON,
  NOTIFICATION_ICON_CONFIG,
  NOTIFICATION_OUTCOME_COLORS,
  NotificationOutcome,
  isNotificationIconType,
} from "@/constant/notificationIcons";

type NotificationIconProps = {
  /** A NotificationIconType; anything else renders the neutral bell. */
  type?: string | null;
  status?: NotificationOutcome | null;
  /** Circle diameter in px. */
  size?: number;
};

const OUTCOME_BADGE_ICONS = {
  passed: Check,
  needs_review: PriorityHigh,
  failed: Close,
} as const;

/**
 * Decorative tinted circle with a category icon. No hooks, so it renders in
 * server and client components alike. The title next to it carries meaning.
 */
export default function NotificationIcon({
  type,
  status,
  size = 30,
}: Readonly<NotificationIconProps>) {
  const config = isNotificationIconType(type)
    ? NOTIFICATION_ICON_CONFIG[type]
    : FALLBACK_NOTIFICATION_ICON;

  // Status changes keep their icon but take the outcome's colours.
  const tone =
    type === "CandidateStatusChanged" && (status === "passed" || status === "failed")
      ? NOTIFICATION_OUTCOME_COLORS[status]
      : config;

  const badgeStatus = type === "AiScreening" ? status : null;
  const Icon = config.icon;
  const BadgeIcon = badgeStatus ? OUTCOME_BADGE_ICONS[badgeStatus] : null;
  const badgeSize = Math.round(size * 0.47);

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: tone.bg,
        color: tone.color,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: Math.round(size * 0.6) }} />

      {BadgeIcon && badgeStatus && (
        <Box
          sx={{
            position: "absolute",
            right: -3,
            bottom: -3,
            width: badgeSize,
            height: badgeSize,
            borderRadius: "50%",
            bgcolor: NOTIFICATION_OUTCOME_COLORS[badgeStatus].color,
            color: "#ffffff",
            border: "2px solid #ffffff",
            display: "grid",
            placeItems: "center",
            boxSizing: "content-box",
          }}
        >
          <BadgeIcon sx={{ fontSize: badgeSize - 3 }} />
        </Box>
      )}
    </Box>
  );
}
