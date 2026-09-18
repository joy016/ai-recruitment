"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  SelectChangeEvent,
  Snackbar,
  Alert,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  getApplicantStatuses,
  ApplicantStatusItem,
} from "@/lib/api/applicant-status";
import { Candidate } from "../(types)/candidates.types";
import { getCandidateList, updateCandidateStatus } from "@/lib/api/candidate";
import CandidateTable from "../(components)/CandidateTable";
import { INITIAL_UPDATE_FORM } from "../(constants)/constants";
import { UpdateStatusPayload } from "@/lib/types/candidate";

const formatScheduleForDisplay = (value: string) => {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const datePart = date.toLocaleDateString("en-US");
  const timePart = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  return `${datePart}, ${timePart}`;
};

function CandidateProfileContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? undefined;
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [lastJobId, setLastJobId] = useState(jobId);
  // const [form, setForm] = useState<UpdateStatusPayload>(INITIAL_UPDATE_FORM);

  if (jobId !== lastJobId) {
    setLastJobId(jobId);
    setPageNumber(1);
  }
  const [savedStatusByApplicantId, setSavedStatusByApplicantId] = useState<
    Record<string, number>
  >({});

  const [scheduleModalApplicantId, setScheduleModalApplicantId] = useState<
    string | null
  >(null);
  const [scheduleModalStatusId, setScheduleModalStatusId] = useState<
    number | null
  >(null);
  const [scheduleDraftValue, setScheduleDraftValue] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [applicantStatuses, setApplicantStatuses] = useState<
    ApplicantStatusItem[]
  >([]);

  const [draftStatusByApplicantId, setDraftStatusByApplicantId] = useState<
    Record<string, number>
  >({});

  const [editingApplicantId, setEditingApplicantId] = useState<string | null>(
    null,
  );
  const [savedScheduleByApplicantId, setSavedScheduleByApplicantId] = useState<
    Record<string, string>
  >({});

  const [draftScheduleByApplicantId, setDraftScheduleByApplicantId] = useState<
    Record<string, string>
  >({});

  const [savingApplicantId, setSavingApplicantId] = useState<string | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const getStatusName = (statusId: number | null) =>
    applicantStatuses.find((status) => status.statusId === statusId)
      ?.statusName ?? null;

  const shouldOpenScheduleModal = (statusId: number) => {
    const statusName = getStatusName(statusId);
    if (!statusName) {
      return false;
    }

    return (
      statusName.includes("Interview") ||
      statusName === "Job Offer" ||
      statusName === "Onboarding"
    );
  };

  const getScheduleModalCopy = (statusId: number | null) => {
    const statusName = getStatusName(statusId);

    if (!statusName) {
      return {
        title: "Schedule Step",
        label: "Date & Time",
        helper: "Choose when to schedule this step.",
      };
    }

    if (statusName.includes("Interview")) {
      return {
        title: "Schedule Interview",
        label: "Interview Date & Time",
        helper: "Choose the interview date and time.",
      };
    }

    if (statusName === "Job Offer") {
      return {
        title: "Schedule Job Offer",
        label: "Job Offer Date & Time",
        helper: "Choose when to discuss or release the job offer.",
      };
    }

    if (statusName === "Onboarding") {
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

  const scheduleModalCopy = getScheduleModalCopy(scheduleModalStatusId);

  useEffect(() => {
    const fetchApplicantStatuses = async () => {
      try {
        const data = await getApplicantStatuses();
        setApplicantStatuses(data);
      } catch (error) {
        console.error("Error fetching applicant statuses:", error);
      }
    };
    fetchApplicantStatuses();
  }, []);

  useEffect(() => {
    const fetchCandidates = async () => {
      setIsLoadingCandidates(true);
      try {
        const response = await getCandidateList(jobId, pageNumber, pageSize);
        setCandidates(response.data);
        setTotalCount(response.totalCount);
      } catch (error) {
        console.error("Error fetching candidates:", error);
      } finally {
        setIsLoadingCandidates(false);
      }
    };
    fetchCandidates();
  }, [jobId, pageNumber, pageSize]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPageNumber(newPage + 1);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(Number(event.target.value));
    setPageNumber(1);
  };

  useEffect(() => {
    if (candidates.length === 0) {
      return;
    }

    setSavedStatusByApplicantId((current) => {
      const next = { ...current };
      candidates.forEach((candidate) => {
        if (!(candidate.id in next)) {
          next[candidate.id] = candidate.applicantStatusId;
        }
      });
      return next;
    });

    setDraftStatusByApplicantId((current) => {
      const next = { ...current };
      candidates.forEach((candidate) => {
        if (!(candidate.id in next)) {
          next[candidate.id] = candidate.applicantStatusId;
        }
      });
      return next;
    });

    setSavedScheduleByApplicantId((current) => {
      const next = { ...current };
      candidates.forEach((candidate) => {
        if (!(candidate.id in next)) {
          next[candidate.id] = candidate.interviewSched ?? "";
        }
      });
      return next;
    });

    setDraftScheduleByApplicantId((current) => {
      const next = { ...current };
      candidates.forEach((candidate) => {
        if (!(candidate.id in next)) {
          next[candidate.id] = candidate.interviewSched ?? "";
        }
      });
      return next;
    });
  }, [candidates]);

  const closeScheduleModal = () => {
    setScheduleModalApplicantId(null);
    setScheduleModalStatusId(null);
    setScheduleDraftValue("");
    setScheduleError(null);
  };

  const handleStatusChange = (
    applicantId: string,
    event: SelectChangeEvent<number | "">,
  ) => {
    if (event.target.value === "") {
      return;
    }

    const nextStatusId = Number(event.target.value);

    setDraftStatusByApplicantId((current) => ({
      ...current,
      [applicantId]: nextStatusId,
    }));

    if (shouldOpenScheduleModal(nextStatusId)) {
      setScheduleModalApplicantId(applicantId);
      setScheduleModalStatusId(nextStatusId);
      setScheduleDraftValue(draftScheduleByApplicantId[applicantId] || "");
      setScheduleError(null);
    }
  };

  const handleSaveStatus = async (applicantId: string) => {
    const nextStatusId = draftStatusByApplicantId[applicantId];

    if (
      shouldOpenScheduleModal(nextStatusId) &&
      !draftScheduleByApplicantId[applicantId]
    ) {
      setScheduleModalApplicantId(applicantId);
      setScheduleModalStatusId(nextStatusId);
      setScheduleDraftValue("");
      setScheduleError(null);
      return;
    }

    const draftSchedule = draftScheduleByApplicantId[applicantId] || "";
    const nextSchedule = draftSchedule
      ? new Date(draftSchedule).toISOString()
      : draftSchedule;

    setSavingApplicantId(applicantId);
    setSaveError(null);

    try {
      await updateCandidateStatus({
        id: applicantId,
        applicantStatusId: nextStatusId,
        interviewSched: nextSchedule,
        updatedAt: new Date().toISOString(),
      });

      setSavedStatusByApplicantId((current) => ({
        ...current,
        [applicantId]: nextStatusId,
      }));
      setSavedScheduleByApplicantId((current) => ({
        ...current,
        [applicantId]: nextSchedule,
      }));
      setEditingApplicantId(null);
    } catch (error) {
      console.error("Error updating candidate status:", error);
      setSaveError("Failed to update candidate status. Please try again.");
    } finally {
      setSavingApplicantId(null);
    }
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

      <CandidateTable
        isMobile={isMobile}
        isLoading={isLoadingCandidates}
        candidates={candidates}
        editingApplicantId={editingApplicantId}
        draftStatusByApplicantId={draftStatusByApplicantId}
        savedStatusByApplicantId={savedStatusByApplicantId}
        savedScheduleByApplicantId={savedScheduleByApplicantId}
        applicantStatuses={applicantStatuses}
        formatScheduleForDisplay={formatScheduleForDisplay}
        savingApplicantId={savingApplicantId}
        onStatusChange={handleStatusChange}
        onEditStatus={handleEditStatus}
        onSaveStatus={handleSaveStatus}
        onCancelStatus={handleCancelStatus}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

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
            {scheduleModalStatusId
              ? `Selected status: ${getStatusName(scheduleModalStatusId)}`
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

      <Snackbar
        open={Boolean(saveError)}
        autoHideDuration={5000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSaveError(null)}
          severity="error"
          variant="filled"
        >
          {saveError}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default function CandidateProfilePage() {
  return (
    <Suspense fallback={null}>
      <CandidateProfileContent />
    </Suspense>
  );
}
