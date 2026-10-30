import { Chip, useTheme } from "@mui/material";
import { CANDIDATE_STATUS_COLORS } from "../(constants)/inbox.constants";

const DEFAULT_STATUS_COLOR = "#9bb7c9";

/** Same solid pill as the Candidates table's Applicant Status column. */
export default function CandidateStatusChip({
  status,
  compact = false,
}: Readonly<{ status: string; compact?: boolean }>) {
  const theme = useTheme();
  const color = CANDIDATE_STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR;

  return (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor: color,
        color: theme.palette.getContrastText(color),
        fontWeight: 600,
        ...(compact && { height: 20, fontSize: "0.7rem" }),
      }}
    />
  );
}
