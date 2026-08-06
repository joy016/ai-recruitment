"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Cancel, Edit, Save, Visibility } from "@mui/icons-material";

const statusOptions = [
  "AI Screening passed",
  "Initial Interview",
  "Technical Interview",
  "Final Interview",
  "Job Offer",
  "Requirements Gathering",
  "Background Check",
  "Onboarding",
  "Offered",
  "Rejected",
] as const;

type ApplicantStatus = (typeof statusOptions)[number];

type Candidate = {
  id: string;
  timestamp: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  yearsOfExperience: string;
  interviewSchedule: string;
  status: ApplicantStatus;
};

const candidates: Candidate[] = [
  {
    id: "APP-1001",
    timestamp: "2026-07-31 09:30",
    email: "sarah.jones@example.com",
    firstName: "Sarah",
    lastName: "Jones",
    phoneNumber: "+1 202-555-0120",
    yearsOfExperience: "4",
    interviewSchedule: "2026-08-08T11:30",
    status: "Initial Interview",
  },
  {
    id: "APP-1002",
    timestamp: "2026-07-31 10:05",
    email: "mark.daniel@example.com",
    firstName: "Mark",
    lastName: "Daniel",
    phoneNumber: "+1 202-555-0188",
    yearsOfExperience: "6",
    interviewSchedule: "2026-08-09T14:00",
    status: "Initial Interview",
  },
];

const shouldOpenScheduleModal = (status: ApplicantStatus) =>
  status.includes("Interview") ||
  status === "Job Offer" ||
  status === "Onboarding";

const getScheduleModalCopy = (status: ApplicantStatus | null) => {
  if (!status) {
    return {
      title: "Schedule Step",
      label: "Date & Time",
      helper: "Choose when to schedule this step.",
    };
  }

  if (status.includes("Interview")) {
    return {
      title: "Schedule Interview",
      label: "Interview Date & Time",
      helper: "Choose the interview date and time.",
    };
  }

  if (status === "Job Offer") {
    return {
      title: "Schedule Job Offer",
      label: "Job Offer Date & Time",
      helper: "Choose when to discuss or release the job offer.",
    };
  }

  if (status === "Onboarding") {
    return {
      title: "Schedule Onboarding",
      label: "Onboarding Date & Time",
      helper: "Choose the onboarding schedule.",
    };
  }

  return {
    title: "Schedule Step",
    label: "Date & Time",
    helper: "Choose when to schedule this step.",
  };
};

const formatScheduleForDisplay = (value: string) => {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export default function CandidateProfilePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [savedStatusByApplicantId, setSavedStatusByApplicantId] = useState<
    Record<string, ApplicantStatus>
  >(() =>
    candidates.reduce<Record<string, ApplicantStatus>>(
      (accumulator, candidate) => {
        accumulator[candidate.id] = candidate.status;
        return accumulator;
      },
      {},
    ),
  );

  const [draftStatusByApplicantId, setDraftStatusByApplicantId] = useState<
    Record<string, ApplicantStatus>
  >(() =>
    candidates.reduce<Record<string, ApplicantStatus>>(
      (accumulator, candidate) => {
        accumulator[candidate.id] = candidate.status;
        return accumulator;
      },
      {},
    ),
  );

  const [editingApplicantId, setEditingApplicantId] = useState<string | null>(
    null,
  );
  const [savedScheduleByApplicantId, setSavedScheduleByApplicantId] = useState<
    Record<string, string>
  >(() =>
    candidates.reduce<Record<string, string>>((accumulator, candidate) => {
      accumulator[candidate.id] = candidate.interviewSchedule;
      return accumulator;
    }, {}),
  );

  const [draftScheduleByApplicantId, setDraftScheduleByApplicantId] = useState<
    Record<string, string>
  >(() =>
    candidates.reduce<Record<string, string>>((accumulator, candidate) => {
      accumulator[candidate.id] = candidate.interviewSchedule;
      return accumulator;
    }, {}),
  );

  const [scheduleModalApplicantId, setScheduleModalApplicantId] = useState<
    string | null
  >(null);
  const [scheduleModalStatus, setScheduleModalStatus] =
    useState<ApplicantStatus | null>(null);
  const [scheduleDraftValue, setScheduleDraftValue] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const scheduleModalCopy = getScheduleModalCopy(scheduleModalStatus);

  const closeScheduleModal = () => {
    setScheduleModalApplicantId(null);
    setScheduleModalStatus(null);
    setScheduleDraftValue("");
    setScheduleError(null);
  };

  const handleStatusChange = (
    applicantId: string,
    event: SelectChangeEvent<ApplicantStatus>,
  ) => {
    const nextStatus = event.target.value as ApplicantStatus;

    setDraftStatusByApplicantId((current) => ({
      ...current,
      [applicantId]: nextStatus,
    }));

    if (shouldOpenScheduleModal(nextStatus)) {
      setScheduleModalApplicantId(applicantId);
      setScheduleModalStatus(nextStatus);
      setScheduleDraftValue(draftScheduleByApplicantId[applicantId] || "");
      setScheduleError(null);
    }
  };

  const handleSaveStatus = (applicantId: string) => {
    const nextStatus = draftStatusByApplicantId[applicantId];

    if (
      shouldOpenScheduleModal(nextStatus) &&
      !draftScheduleByApplicantId[applicantId]
    ) {
      setScheduleModalApplicantId(applicantId);
      setScheduleModalStatus(nextStatus);
      setScheduleDraftValue("");
      setScheduleError(null);
      return;
    }

    setSavedStatusByApplicantId((current) => ({
      ...current,
      [applicantId]: draftStatusByApplicantId[applicantId],
    }));
    setSavedScheduleByApplicantId((current) => ({
      ...current,
      [applicantId]: draftScheduleByApplicantId[applicantId],
    }));
    setEditingApplicantId(null);
  };

  const handleCancelStatus = (applicantId: string) => {
    setDraftStatusByApplicantId((current) => ({
      ...current,
      [applicantId]: savedStatusByApplicantId[applicantId],
    }));
    setDraftScheduleByApplicantId((current) => ({
      ...current,
      [applicantId]: savedScheduleByApplicantId[applicantId],
    }));
    if (scheduleModalApplicantId === applicantId) {
      closeScheduleModal();
    }
    setEditingApplicantId(null);
  };

  const handleScheduleCancel = () => {
    if (!scheduleModalApplicantId) {
      closeScheduleModal();
      return;
    }

    const applicantId = scheduleModalApplicantId;

    setDraftStatusByApplicantId((current) => ({
      ...current,
      [applicantId]: savedStatusByApplicantId[applicantId],
    }));
    closeScheduleModal();
  };

  const handleScheduleSave = () => {
    if (!scheduleModalApplicantId) {
      return;
    }

    if (!scheduleDraftValue) {
      setScheduleError("Please choose date and time.");
      return;
    }

    setDraftScheduleByApplicantId((current) => ({
      ...current,
      [scheduleModalApplicantId]: scheduleDraftValue,
    }));
    closeScheduleModal();
  };

  const handleEditStatus = (applicantId: string) => {
    setEditingApplicantId(applicantId);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        p: { xs: 1.25, sm: 2, md: 2.5 },
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
      }}
    >
      <Typography
        variant={isMobile ? "h6" : "h5"}
        sx={{ fontWeight: 700, color: "#17456a", mb: 2 }}
      >
        Candidates Profile
      </Typography>

      {isMobile ? (
        <Stack spacing={1.2}>
          {candidates.map((candidate) => {
            const isEditing = editingApplicantId === candidate.id;
            const hasPendingStatusChange =
              draftStatusByApplicantId[candidate.id] !==
              savedStatusByApplicantId[candidate.id];

            return (
              <Paper
                key={candidate.id}
                elevation={0}
                sx={{
                  p: 1.3,
                  borderRadius: 2,
                  border: "1px solid #dfedf7",
                  bgcolor: "#fcfeff",
                }}
              >
                <Stack spacing={0.8}>
                  <Typography sx={{ fontWeight: 700, color: "#1d4f72" }}>
                    {candidate.firstName} {candidate.lastName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#52718c" }}>
                    {candidate.email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#52718c" }}>
                    Timestamp: {candidate.timestamp}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#52718c" }}>
                    Experience: {candidate.yearsOfExperience} years
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#52718c" }}>
                    Interview Sched:{" "}
                    {formatScheduleForDisplay(
                      savedScheduleByApplicantId[candidate.id],
                    )}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ pt: 0.5 }}
                  >
                    <Tooltip title="View resume">
                      <IconButton
                        component={Link}
                        href={`/hr/candidates/profile/${candidate.id}`}
                        aria-label={`View resume for ${candidate.firstName} ${candidate.lastName}`}
                        sx={{ color: "#1f80b6" }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>

                    <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                      <Select
                        value={draftStatusByApplicantId[candidate.id]}
                        disabled={!isEditing}
                        onChange={(event) =>
                          handleStatusChange(candidate.id, event)
                        }
                      >
                        {statusOptions.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {!isEditing ? (
                      <Tooltip title="Edit status">
                        <IconButton
                          aria-label={`Edit status for ${candidate.firstName} ${candidate.lastName}`}
                          onClick={() => handleEditStatus(candidate.id)}
                          sx={{ color: "#1f80b6" }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Stack direction="row" spacing={0.3}>
                        <IconButton
                          aria-label={`Save status for ${candidate.firstName} ${candidate.lastName}`}
                          onClick={() => handleSaveStatus(candidate.id)}
                          disabled={!hasPendingStatusChange}
                          sx={{
                            color: "#2f90c5",
                            "&.Mui-disabled": { color: "#9bb7c9" },
                          }}
                        >
                          <Save />
                        </IconButton>
                        <IconButton
                          aria-label={`Cancel status edit for ${candidate.firstName} ${candidate.lastName}`}
                          onClick={() => handleCancelStatus(candidate.id)}
                          sx={{ color: "#7b94a8" }}
                        >
                          <Cancel />
                        </IconButton>
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      ) : (
        <TableContainer
          sx={{
            width: "100%",
            maxWidth: "100%",
            maxHeight: { xs: "62vh", md: "68vh" },
            overflow: "auto",
            overflowX: "auto",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
            border: "1px solid #e1eef7",
            borderRadius: 2,
            bgcolor: "#ffffff",
          }}
        >
          <Table
            stickyHeader
            sx={{
              width: "100%",
              minWidth: 1100,
              "& th, & td": {
                whiteSpace: "nowrap",
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ bgcolor: "#f2f9ff" }}>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  View Resume
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Timestamp
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Email Address
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  First Name
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Last Name
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Years of Experience
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Interview Sched
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Applicant Status
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, color: "#264a66", bgcolor: "#f2f9ff" }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {candidates.map((candidate) => {
                const isEditing = editingApplicantId === candidate.id;
                const hasPendingStatusChange =
                  draftStatusByApplicantId[candidate.id] !==
                  savedStatusByApplicantId[candidate.id];

                return (
                  <TableRow key={candidate.id} hover>
                    <TableCell>
                      <Tooltip title="View resume">
                        <IconButton
                          component={Link}
                          href={`/hr/candidates/profile/${candidate.id}`}
                          aria-label={`View resume for ${candidate.firstName} ${candidate.lastName}`}
                          sx={{ color: "#1f80b6" }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{candidate.timestamp}</TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell>{candidate.firstName}</TableCell>
                    <TableCell>{candidate.lastName}</TableCell>
                    <TableCell>{candidate.yearsOfExperience}</TableCell>
                    <TableCell>
                      {formatScheduleForDisplay(
                        savedScheduleByApplicantId[candidate.id],
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 170 }}>
                        <Select
                          value={draftStatusByApplicantId[candidate.id]}
                          disabled={!isEditing}
                          onChange={(event) =>
                            handleStatusChange(candidate.id, event)
                          }
                        >
                          {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.6}>
                        {!isEditing ? (
                          <Tooltip title="Edit status">
                            <IconButton
                              aria-label={`Edit status for ${candidate.firstName} ${candidate.lastName}`}
                              onClick={() => handleEditStatus(candidate.id)}
                              sx={{ color: "#1f80b6" }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <>
                            <Tooltip title="Save status">
                              <Box component="span">
                                <IconButton
                                  aria-label={`Save status for ${candidate.firstName} ${candidate.lastName}`}
                                  onClick={() => handleSaveStatus(candidate.id)}
                                  disabled={!hasPendingStatusChange}
                                  sx={{
                                    color: "#2f90c5",
                                    "&.Mui-disabled": { color: "#9bb7c9" },
                                  }}
                                >
                                  <Save />
                                </IconButton>
                              </Box>
                            </Tooltip>
                            <Tooltip title="Cancel edit">
                              <IconButton
                                aria-label={`Cancel status edit for ${candidate.firstName} ${candidate.lastName}`}
                                onClick={() => handleCancelStatus(candidate.id)}
                                sx={{ color: "#7b94a8" }}
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={Boolean(scheduleModalApplicantId)}
        onClose={handleScheduleCancel}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ color: "#17456a", fontWeight: 700 }}>
          {scheduleModalCopy.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#5d7f97", mb: 1.5 }}>
            {scheduleModalStatus
              ? `Selected status: ${scheduleModalStatus}`
              : "Select a schedule."}
          </Typography>
          <TextField
            type="datetime-local"
            label={scheduleModalCopy.label}
            value={scheduleDraftValue}
            onChange={(event) => {
              setScheduleDraftValue(event.target.value);
              setScheduleError(null);
            }}
            fullWidth
            InputLabelProps={{ shrink: true }}
            error={Boolean(scheduleError)}
            helperText={scheduleError || scheduleModalCopy.helper}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleScheduleCancel} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleScheduleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
