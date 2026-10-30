import { Box, Chip, Stack, Typography } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { SCREENING_TONES, ScreeningToneName } from "@/constant/screening";

type SkillChipsProps = {
  title: string;
  skills: string[];
  tone: Extract<ScreeningToneName, "success" | "danger">;
  emptyText: string;
};

/** Labelled, wrapping list of tinted skill chips with a friendly empty state. */
export default function SkillChips({
  title,
  skills,
  tone,
  emptyText,
}: Readonly<SkillChipsProps>) {
  const colors = SCREENING_TONES[tone];

  return (
    <Box component="section">
      <Typography sx={{ fontWeight: 700, color: "#17456a", mb: 1 }}>
        {title} ({skills.length})
      </Typography>

      {skills.length === 0 ? (
        <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
          <CheckCircle
            aria-hidden="true"
            sx={{ fontSize: 20, color: SCREENING_TONES.success.color }}
          />
          <Typography variant="body2" sx={{ color: "#52718c" }}>
            {emptyText}
          </Typography>
        </Stack>
      ) : (
        <Box
          component="ul"
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, m: 0, p: 0, listStyle: "none" }}
        >
          {skills.map((skill, index) => (
            <Box component="li" key={`${skill}-${index}`} sx={{ maxWidth: "100%" }}>
              <Chip
                label={skill}
                size="small"
                sx={{
                  bgcolor: colors.bg,
                  color: colors.color,
                  border: `1px solid ${colors.color}33`,
                  fontWeight: 600,
                  maxWidth: "100%",
                }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
