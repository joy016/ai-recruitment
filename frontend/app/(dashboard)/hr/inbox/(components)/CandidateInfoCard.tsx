import Link from "next/link";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import {
  EventAvailableOutlined,
  OpenInNew,
  WorkOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";
import { INBOX_COLORS } from "../(constants)/inbox.constants";
import type { MockCandidate } from "../(types)/inbox.types";
import { formatSchedule, getAvatarColor, getInitials } from "../(utils)/inbox.utils";
import CandidateStatusChip from "./CandidateStatusChip";

type CandidateInfoCardProps = {
  candidate: MockCandidate;
  onScheduleInterview: () => void;
};

function Detail({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
      <Box aria-hidden="true" sx={{ color: INBOX_COLORS.primary, display: "flex" }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ display: "block", color: INBOX_COLORS.muted, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography noWrap sx={{ fontSize: "0.85rem", fontWeight: 600, color: INBOX_COLORS.text }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function CandidateInfoCard({
  candidate,
  onScheduleInterview,
}: Readonly<CandidateInfoCardProps>) {
  return (
    <Box
      component="section"
      aria-label="Candidate details"
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${INBOX_COLORS.border}`,
        background: "linear-gradient(135deg, #f2f9ff 0%, #ffffff 70%)",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            fontWeight: 700,
            bgcolor: getAvatarColor(candidate.email),
          }}
        >
          {getInitials(candidate.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: INBOX_COLORS.muted, fontWeight: 700, lineHeight: 1.4 }}>
            Candidate
          </Typography>
          <Typography noWrap sx={{ fontWeight: 700, color: INBOX_COLORS.heading }}>
            {candidate.name}
          </Typography>
        </Box>
        <CandidateStatusChip status={candidate.status} />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Detail icon={<WorkOutlined fontSize="small" />} label="Applied for" value={candidate.jobTitle} />
        <Detail
          icon={<WorkspacePremiumOutlined fontSize="small" />}
          label="Experience"
          value={`${candidate.yearsOfExperience} years`}
        />
        <Detail
          icon={<EventAvailableOutlined fontSize="small" />}
          label="Interview"
          value={formatSchedule(candidate.interviewSchedule)}
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<EventAvailableOutlined />}
          onClick={onScheduleInterview}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: INBOX_COLORS.primary,
            boxShadow: "none",
          }}
        >
          Schedule Interview
        </Button>
        {/* TODO(wire-up): link to /hr/candidates/profile/{id} once real ids are used. */}
        <Button
          size="small"
          variant="outlined"
          component={Link}
          href="/hr/candidates"
          endIcon={<OpenInNew sx={{ fontSize: "16px !important" }} />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            borderColor: "#9cc7df",
            color: INBOX_COLORS.primary,
          }}
        >
          View Profile
        </Button>
      </Stack>
    </Box>
  );
}
