"use client";

import { Suspense, SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  SelectChangeEvent,
  Snackbar,
  Tab,
  Tabs,
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
import { Candidate } from "./(types)/candidates.types";
import { getCandidateList, updateCandidateStatus } from "@/lib/api/candidate";
import { onCandidatesRefresh } from "@/lib/utils/candidatesRefresh";
import { getInterviwer } from "@/lib/api/roles";
import { Interviewer } from "@/lib/types/user";
import CandidateTable from "./(components)/CandidateTable";
import {
  createMuiPageChangeHandler,
  createMuiPageSizeChangeHandler,
} from "@/lib/utils/pagination";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/constant/permissions";

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

// Converts a stored schedule (ISO string) to the "YYYY-MM-DDTHH:mm" local
// format that <input type="datetime-local"> expects.
const toDateTimeLocalValue = (value: string | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Earliest selectable schedule (now), so past dates are disabled in the picker.
const getMinScheduleValue = () => toDateTimeLocalValue(new Date().toISOString());

const isPastSchedule = (value: string | undefined) =>
  Boolean(value) && new Date(value as string).getTime() < Date.now();

function CandidateProfileContent() {
  const { hasPermission } = usePermissions();
  // Updating status and scheduling interviews go through updateCandidateStatus.
  const canEditCandidates = hasPermission(PERMISSIONS.candidates.edit);
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
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [interviewerDraftValue, setInterviewerDraftValue] = useState("");
  const [interviewerError, setInterviewerError] = useState<string | null>(null);
  const [draftInterviewerByApplicantId, setDraftInterviewerByApplicantId] =
    useState<Record<string, string>>({});
  const [applicantStatuses, setApplicantStatuses] = useState<
    ApplicantStatusItem[]
  >([]);

  const MANUAL_REVIEW_STATUS_NAME = "Manual Review";
  const manualReviewStatus = applicantStatuses.find(
    (status) => status.statusName === MANUAL_REVIEW_STATUS_NAME,
  );
  const [activeTab, setActiveTab] = useState<"all" | "manualReview">("all");
  const [manualReviewCount, setManualReviewCount] = useState(0);

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
        assigneeLabel: "Interviewer",
        assigneeHelper: "Assign who will conduct this interview.",
      };
    }

    if (statusName === "Job Offer") {
      return {
        title: "Schedule Job Offer",
        label: "Job Offer Date & Time",
        helper: "Choose when to discuss or release the job offer.",
        assigneeLabel: "Facilitator",
        assigneeHelper: "Assign who will facilitate the job offer.",
      };
    }

    if (statusName === "Onboarding") {
      return {
        title: "Schedule Onboarding",
        label: "Onboarding Date & Time",
        helper: "Choose the onboarding schedule.",
        assigneeLabel: "Facilitator",
        assigneeHelper: "Assign who will facilitate the onboarding.",
      };
    }

    return {
      title: "Schedule Step",
      label: "Date & Time",
      helper: "Choose when to schedule this step.",
    };
  };

  // Interview steps need an Interviewer; Job Offer and Onboarding need a
  // Facilitator. Both are picked from the same interviewer list.
  const requiresAssignee = (statusId: number | null) => {
    const statusName = getStatusName(statusId);
    return Boolean(
      statusName?.includes("Interview") ||
        statusName === "Job Offer" ||
        statusName === "Onboarding",
    );
  };

  const scheduleModalCopy = getScheduleModalCopy(scheduleModalStatusId);
  const showInterviewerSelect = requiresAssignee(scheduleModalStatusId);
  const assigneeLabel = scheduleModalCopy.assigneeLabel ?? "Interviewer";

  useEffect(() => {
    const fetchInterviewers = async () => {
      try {
        const interviewers = await getInterviwer();
        setInterviewers(interviewers);
      } catch (error) {
        console.error("Error fetching interviewers:", error);
      }
    };
    fetchInterviewers();
  }, []);

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

  // Always-current refs so the silent refetch (triggered by a global event,
  // not a React dependency change) reads the latest page/filter/tab instead
  // of whatever was captured when the subscription effect first ran.
  const jobIdRef = useRef(jobId);
  const pageNumberRef = useRef(pageNumber);
  const pageSizeRef = useRef(pageSize);
  const activeTabRef = useRef(activeTab);
  const manualReviewStatusRef = useRef(manualReviewStatus);
  useEffect(() => {
    jobIdRef.current = jobId;
    pageNumberRef.current = pageNumber;
    pageSizeRef.current = pageSize;
    activeTabRef.current = activeTab;
    manualReviewStatusRef.current = manualReviewStatus;
  });

  // Drop responses from superseded requests (a silent refresh racing a
  // page/filter change, or two silent refreshes overlapping).
  const candidatesRequestIdRef = useRef(0);
  const manualReviewRequestIdRef = useRef(0);

  const fetchCandidates = useCallback(async (options?: { silent?: boolean }) => {
    const requestId = ++candidatesRequestIdRef.current;
    if (!options?.silent) setIsLoadingCandidates(true);
    try {
      const statusId =
        activeTabRef.current === "manualReview" ? manualReviewStatusRef.current?.statusId : undefined;
      const response = await getCandidateList(
        jobIdRef.current,
        pageNumberRef.current,
        pageSizeRef.current,
        statusId,
      );
      if (requestId !== candidatesRequestIdRef.current) return; // superseded
      setCandidates(response.data);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      if (requestId === candidatesRequestIdRef.current) setIsLoadingCandidates(false);
    }
  }, []);

  const fetchManualReviewCount = useCallback(async () => {
    const status = manualReviewStatusRef.current;
    if (!status) return;
    const requestId = ++manualReviewRequestIdRef.current;
    try {
      const response = await getCandidateList(jobIdRef.current, 1, 1, status.statusId);
      if (requestId !== manualReviewRequestIdRef.current) return; // superseded
      setManualReviewCount(response.totalCount);
    } catch (error) {
      console.error("Error fetching manual review count:", error);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [jobId, pageNumber, pageSize, activeTab, manualReviewStatus?.statusId, fetchCandidates]);

  useEffect(() => {
    fetchManualReviewCount();
  }, [jobId, manualReviewStatus, fetchManualReviewCount]);

  // Shared live-refresh heartbeat (and any immediate post-mutation nudge):
  // refetch both quietly, no spinner, keeping the current page/filters/tab.
  useEffect(
    () =>
      onCandidatesRefresh(() => {
        void fetchCandidates({ silent: true });
        void fetchManualReviewCount();
      }),
    [fetchCandidates, fetchManualReviewCount],
  );

  const handlePageChange = createMuiPageChangeHandler(setPageNumber);

  const handlePageSizeChange = createMuiPageSizeChangeHandler(
    setPageNumber,
    setPageSize,
  );

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
    setInterviewerDraftValue("");
    setInterviewerError(null);
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
      setScheduleDraftValue(
        toDateTimeLocalValue(draftScheduleByApplicantId[applicantId]),
      );
      setScheduleError(null);
      setInterviewerDraftValue(
        draftInterviewerByApplicantId[applicantId] || "",
      );
      setInterviewerError(null);
    }
  };

  const hasStatusChange = (applicantId: string) =>
    draftStatusByApplicantId[applicantId] !==
    savedStatusByApplicantId[applicantId];

  const hasScheduleChange = (applicantId: string) =>
    toDateTimeLocalValue(draftScheduleByApplicantId[applicantId]) !==
    toDateTimeLocalValue(savedScheduleByApplicantId[applicantId]);

  const hasPendingChanges = (applicantId: string) =>
    hasStatusChange(applicantId) || hasScheduleChange(applicantId);

  const handleScheduleChange = (applicantId: string, value: string) => {
    setDraftScheduleByApplicantId((current) => ({
      ...current,
      [applicantId]: value,
    }));
  };

  const handleSaveStatus = async (applicantId: string) => {
    if (!canEditCandidates) return;
    const nextStatusId = draftStatusByApplicantId[applicantId];
    const isRescheduleOnly = !hasStatusChange(applicantId);

    const interviewerId = requiresAssignee(nextStatusId)
      ? draftInterviewerByApplicantId[applicantId]
      : undefined;

    // Rescheduling keeps the current status (and interviewer), so the
    // schedule modal is only needed when the status itself changes.
    if (
      isRescheduleOnly &&
      shouldOpenScheduleModal(nextStatusId) &&
      !draftScheduleByApplicantId[applicantId]
    ) {
      setSaveError("Please choose a date and time for this schedule.");
      return;
    }

    if (
      isRescheduleOnly &&
      shouldOpenScheduleModal(nextStatusId) &&
      isPastSchedule(draftScheduleByApplicantId[applicantId])
    ) {
      setSaveError("Please choose a future date and time.");
      return;
    }

    if (
      !isRescheduleOnly &&
      shouldOpenScheduleModal(nextStatusId) &&
      (!draftScheduleByApplicantId[applicantId] ||
        isPastSchedule(draftScheduleByApplicantId[applicantId]) ||
        (requiresAssignee(nextStatusId) && !interviewerId))
    ) {
      setScheduleModalApplicantId(applicantId);
      setScheduleModalStatusId(nextStatusId);
      setScheduleDraftValue(
        toDateTimeLocalValue(draftScheduleByApplicantId[applicantId]),
      );
      setScheduleError(null);
      setInterviewerDraftValue(interviewerId || "");
      setInterviewerError(null);
      return;
    }

    const draftSchedule = draftScheduleByApplicantId[applicantId] || "";
    const nextSchedule = draftSchedule
      ? new Date(draftSchedule).toISOString()
      : draftSchedule;

    setSavingApplicantId(applicantId);
    setSaveError(null);

    // Job Offer and Onboarding have their own schedule and facilitator
    // fields; every other status keeps using the interview fields.
    // Statuses without a schedule (e.g. Manual Review) send null, never "".
    const nextStatusName = getStatusName(nextStatusId);
    const payloadSchedule =
      shouldOpenScheduleModal(nextStatusId) && nextSchedule
        ? nextSchedule
        : null;
    const scheduleFields =
      nextStatusName === "Job Offer"
        ? { jobOfferSched: payloadSchedule, jobOfferFacilitatorId: interviewerId }
        : nextStatusName === "Onboarding"
          ? {
              onboardingSched: payloadSchedule,
              onboardingFacilitatorId: interviewerId,
            }
          : { interviewSched: payloadSchedule, interviewerId };

    try {
      await updateCandidateStatus({
        id: applicantId,
        applicantStatusId: nextStatusId,
        ...scheduleFields,
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
    setDraftInterviewerByApplicantId((current) => {
      const next = { ...current };
      delete next[applicantId];
      return next;
    });
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
    if (!canEditCandidates) return;
    if (!scheduleModalApplicantId) {
      return;
    }

    const missingSchedule = !scheduleDraftValue;
    const missingInterviewer = showInterviewerSelect && !interviewerDraftValue;

    const pastSchedule = isPastSchedule(scheduleDraftValue);

    if (missingSchedule) {
      setScheduleError("Please choose date and time.");
    } else if (pastSchedule) {
      setScheduleError("Please choose a future date and time.");
    }
    if (missingInterviewer) {
      setInterviewerError(
        `Please assign ${assigneeLabel === "Facilitator" ? "a facilitator" : "an interviewer"}.`,
      );
    }
    if (missingSchedule || pastSchedule || missingInterviewer) {
      return;
    }

    setDraftScheduleByApplicantId((current) => ({
      ...current,
      [scheduleModalApplicantId]: scheduleDraftValue,
    }));
    if (showInterviewerSelect) {
      setDraftInterviewerByApplicantId((current) => ({
        ...current,
        [scheduleModalApplicantId]: interviewerDraftValue,
      }));
    }
    closeScheduleModal();
  };

  const handleEditStatus = (applicantId: string) => {
    if (!canEditCandidates) return;
    setEditingApplicantId(applicantId);
  };

  const handleTabChange = (_event: SyntheticEvent, value: "all" | "manualReview") => {
    setActiveTab(value);
    setPageNumber(1);
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

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 2, minHeight: 0 }}
      >
        <Tab label="All Candidates" value="all" sx={{ minHeight: 0 }} />
        <Tab
          value="manualReview"
          sx={{ minHeight: 0 }}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>Needs Manual Review</span>
              {manualReviewCount > 0 && (
                <Badge
                  badgeContent={manualReviewCount}
                  color="warning"
                  sx={{ "& .MuiBadge-badge": { position: "static", transform: "none" } }}
                />
              )}
            </Box>
          }
        />
      </Tabs>

      <CandidateTable
        canEdit={canEditCandidates}
        isMobile={isMobile}
        isLoading={isLoadingCandidates}
        candidates={candidates}
        editingApplicantId={editingApplicantId}
        draftStatusByApplicantId={draftStatusByApplicantId}
        savedStatusByApplicantId={savedStatusByApplicantId}
        savedScheduleByApplicantId={savedScheduleByApplicantId}
        draftScheduleByApplicantId={draftScheduleByApplicantId}
        applicantStatuses={applicantStatuses}
        formatScheduleForDisplay={formatScheduleForDisplay}
        toDateTimeLocalValue={toDateTimeLocalValue}
        hasPendingChanges={hasPendingChanges}
        requiresSchedule={shouldOpenScheduleModal}
        savingApplicantId={savingApplicantId}
        onStatusChange={handleStatusChange}
        onScheduleChange={handleScheduleChange}
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
            slotProps={{ htmlInput: { min: getMinScheduleValue() } }}
          />
          {showInterviewerSelect && (
            <TextField
              select
              label={assigneeLabel}
              value={interviewerDraftValue}
              onChange={(event) => {
                setInterviewerDraftValue(event.target.value);
                setInterviewerError(null);
              }}
              fullWidth
              required
              error={Boolean(interviewerError)}
              helperText={
                interviewerError ||
                (interviewers.length === 0
                  ? `No active ${assigneeLabel.toLowerCase()}s found.`
                  : scheduleModalCopy.assigneeHelper)
              }
              sx={{ mt: 2 }}
            >
              {interviewers.map((interviewer) => (
                <MenuItem
                  key={interviewer.interviewerId}
                  value={interviewer.interviewerId}
                >
                  {interviewer.interviewerName}
                </MenuItem>
              ))}
            </TextField>
          )}
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
