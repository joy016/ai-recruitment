import { Chip } from "@mui/material";
import {
  RECOMMENDATION_CONFIG,
  SCREENING_TONES,
  normalizeScreeningValue,
} from "@/constant/screening";

type RecommendationBadgeProps = {
  recommendation: string | null;
};

/** Solid pill like the Applicant Status chips; unknown values are gray. */
export default function RecommendationBadge({
  recommendation,
}: Readonly<RecommendationBadgeProps>) {
  const key = normalizeScreeningValue(recommendation);
  const config = Object.hasOwn(RECOMMENDATION_CONFIG, key)
    ? RECOMMENDATION_CONFIG[key as keyof typeof RECOMMENDATION_CONFIG]
    : null;
  const tone = SCREENING_TONES[config?.tone ?? "neutral"];
  const label = config?.label ?? (recommendation?.trim() || "No recommendation");

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: tone.color,
        color: "#ffffff",
        fontWeight: 600,
        maxWidth: "100%",
      }}
    />
  );
}
