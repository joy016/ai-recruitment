"use client";

import { useId, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { INBOX_COLORS } from "../(constants)/inbox.constants";

type ScheduleInterviewDialogProps = {
  open: boolean;
  candidateName: string;
  onClose: () => void;
  onSchedule: (summary: string) => void;
};

const INTERVIEW_TYPES = ["Initial Interview", "Technical Interview", "Final Interview"];

// DESIGN-ONLY. TODO(wire-up): call updateCandidateStatus with the schedule.
export default function ScheduleInterviewDialog({
  open,
  candidateName,
  onClose,
  onSchedule,
}: Readonly<ScheduleInterviewDialogProps>) {
  const titleId = useId();
  const [type, setType] = useState(INTERVIEW_TYPES[0]);
  const [dateTime, setDateTime] = useState("");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <DialogTitle id={titleId} sx={{ pb: 0.5 }}>
        <Typography component="span" sx={{ display: "block", fontWeight: 700, color: INBOX_COLORS.heading }}>
          Schedule Interview
        </Typography>
        <Typography component="span" variant="body2" sx={{ color: INBOX_COLORS.muted }}>
          {candidateName}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1.5 }}>
          <TextField
            select
            size="small"
            label="Interview type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {INTERVIEW_TYPES.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="datetime-local"
            size="small"
            label="Date & time"
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: INBOX_COLORS.muted }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!dateTime}
          onClick={() => {
            onSchedule(`${type} for ${candidateName}`);
            onClose();
          }}
          sx={{ textTransform: "none", fontWeight: 700, bgcolor: INBOX_COLORS.primary, boxShadow: "none" }}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}
