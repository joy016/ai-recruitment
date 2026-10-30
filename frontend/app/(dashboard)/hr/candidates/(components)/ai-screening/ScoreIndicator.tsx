import { Box, CircularProgress, Typography } from "@mui/material";
import { SCREENING_TONES, getScoreTone } from "@/constant/screening";

type ScoreIndicatorProps = {
  score: number | null;
  size?: number;
};

/** Circular 0–100 gauge; green 80+, amber 50–79, red below 50. */
export default function ScoreIndicator({
  score,
  size = 88,
}: Readonly<ScoreIndicatorProps>) {
  if (score === null || Number.isNaN(score)) {
    return (
      <Typography variant="body2" sx={{ color: "#5f7f96" }}>
        Not scored
      </Typography>
    );
  }

  const value = Math.min(Math.max(Math.round(score), 0), 100);
  const tone = SCREENING_TONES[getScoreTone(value)];

  return (
    <Box
      role="img"
      aria-label={`Qualification score ${value} out of 100`}
      sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      {/* Track */}
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={4.5}
        sx={{ color: tone.bg, position: "absolute", inset: 0 }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={4.5}
        sx={{
          color: tone.color,
          position: "absolute",
          inset: 0,
          "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          alignContent: "center",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 24, lineHeight: 1, color: tone.color }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: "#5f7f96", lineHeight: 1.4 }}>
          / 100
        </Typography>
      </Box>
    </Box>
  );
}
