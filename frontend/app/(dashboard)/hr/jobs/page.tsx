"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from "@mui/material";
import { Check, MoreHoriz } from "@mui/icons-material";
import { getAllJobs, getJobDetails, updateJobStatus } from "@/lib/api/job";
import { JobDetailsResponse, JobItem } from "@/lib/types/job";
import JobModalForm, {
  employmentTypes,
  EmploymentType,
  JobFormValues,
  JobStatus,
} from "./(components)/JobModalForm";
import ViewJob from "./(components)/ViewJob";
import ApplicationFormModal from "./(components)/ApplicationFormModal";
import {
  FLOW_STEPS,
  JOB_STATUS,
  JOBS_PAGE_SIZE,
  JOBS_PAGE_SIZE_OPTIONS,
  JOBS_TABLE_HEIGHT,
} from "@/app/(constants)/job";
import ConfirmationModal from "@/app/component/ConfirmationModal";

const mapJobDetailsToFormValues = (
  details: JobDetailsResponse,
): JobFormValues => ({
  title: details.jobTitle,
  location: details.location,
  employmentType: (employmentTypes as readonly string[]).includes(
    details.jobType,
  )
    ? (details.jobType as EmploymentType)
    : "Full-time",
  status: (["Open", "Closed", "Draft"] as JobStatus[]).includes(
    details.jobStatus as JobStatus,
  )
    ? (details.jobStatus as JobStatus)
    : "Draft",
  description: details.jobDescription,
  qualifications: details.qualifications,
  techSkills: details.techSkills,
  department: details.department,
});

const getStatusChipStyle = (status: string) => {
  if (status === "Open") {
    return {
      color: "#1c8758",
      backgroundColor: "#e8f7ef",
      borderColor: "#b7e7cb",
    };
  }

  if (status === "Closed") {
    return {
      color: "#7b5a19",
      backgroundColor: "#fff5e6",
      borderColor: "#f0d8a7",
    };
  }

  return {
    color: "#5a6e81",
    backgroundColor: "#eef4f8",
    borderColor: "#d4e2ec",
  };
};

const formatPostedDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function JobsPage() {
  const [jobPosts, setJobPosts] = useState<JobItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | JobStatus>("Open");
  const [applicationFormJob, setApplicationFormJob] = useState<JobItem | null>(
    null,
  );
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [generatedTokenByJobId, setGeneratedTokenByJobId] = useState<
    Record<number, string>
  >({});
  const [toastMessage, setToastMessage] = useState(
    "Application link generated and copied.",
  );
  const [toastOpen, setToastOpen] = useState(false);

  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [createJobModalKey, setCreateJobModalKey] = useState(0);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingJobValues, setEditingJobValues] =
    useState<JobFormValues | null>(null);
  const [loadingEditJobId, setLoadingEditJobId] = useState<number | null>(null);

  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [statusMenuJob, setStatusMenuJob] = useState<JobItem | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(JOBS_PAGE_SIZE);
  const [totalJobCount, setTotalJobCount] = useState(0);

  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    job: JobItem;
    newStatus: JobStatus;
  } | null>(null);

  const fetchJobPosts = async () => {
    try {
      const response = await getAllJobs(statusFilter, pageNumber, pageSize);
      setJobPosts(response.data);
      setTotalJobCount(response.totalCount || 0);
    } catch (error) {
      console.error("Failed to fetch job posts:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobPosts();
  }, [statusFilter, pageNumber, pageSize]);

  const applicationLink = useMemo(() => {
    if (!applicationFormJob) {
      return "";
    }

    const generatedToken = generatedTokenByJobId[applicationFormJob.jobId];
    if (!generatedToken) {
      return "";
    }

    const query = new URLSearchParams({
      role: applicationFormJob.jobTitle || "General Application",
      recipient: recipientEmail || "",
      jobId: String(applicationFormJob.jobId),
    });

    return `/apply/${generatedToken}?${query.toString()}`;
  }, [applicationFormJob, generatedTokenByJobId, recipientEmail]);

  const fullApplicationLink = useMemo(() => {
    if (!applicationLink || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}${applicationLink}`;
  }, [applicationLink]);

  const visibleJobPosts = useMemo(() => {
    return jobPosts.filter((jobPost) => {
      const matchesSearch =
        searchKeyword.trim().length === 0 ||
        jobPost.jobTitle.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || jobPost.jobStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobPosts, searchKeyword, statusFilter]);

  const createToken = () => {
    const randomPart = crypto.getRandomValues(new Uint32Array(2));
    const segmentA = randomPart[0].toString(36).toUpperCase();
    const segmentB = randomPart[1].toString(36).toUpperCase();
    return `APPFORM-${segmentA}${segmentB}`;
  };

  const ensureJobToken = (jobId: number) => {
    const existingToken = generatedTokenByJobId[jobId];
    if (existingToken) {
      return existingToken;
    }

    const newToken = createToken();
    setGeneratedTokenByJobId((current) => ({
      ...current,
      [jobId]: newToken,
    }));
    return newToken;
  };

  const handleOpenApplicationForm = (jobPost: JobItem) => {
    ensureJobToken(jobPost.jobId);
    setRecipientEmail("");
    setApplicationFormJob(jobPost);
  };

  const handleGenerateLink = async () => {
    if (!applicationFormJob) {
      return;
    }

    const token = createToken();
    setGeneratedTokenByJobId((current) => ({
      ...current,
      [applicationFormJob.jobId]: token,
    }));

    const query = new URLSearchParams({
      role: applicationFormJob.jobTitle || "General Application",
      recipient: recipientEmail,
      jobId: String(applicationFormJob.jobId),
    });
    const shareablePath = `/apply/${token}?${query.toString()}`;
    const shareableUrl = `${window.location.origin}${shareablePath}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      }
      setToastMessage("Application link generated and copied.");
    } catch {
      setToastMessage("Application link generated. Copy it from the field.");
    }

    setToastOpen(true);
  };

  const handleSendEmail = () => {
    if (!fullApplicationLink || !recipientEmail.trim() || !applicationFormJob) {
      return;
    }

    const subject = encodeURIComponent(
      `${applicationFormJob.jobTitle} - Application Form`,
    );
    const body = encodeURIComponent(
      `Hi,\n\nPlease complete your application form using this link:\n${fullApplicationLink}\n\nKind regards,\nHR Team`,
    );
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    if (!fullApplicationLink) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullApplicationLink);
      }
      setToastMessage("Application link copied to clipboard.");
    } catch {
      setToastMessage("Copy failed. Please copy the link manually.");
    }

    setToastOpen(true);
  };

  const handleStatusFilterChange = (
    event: SelectChangeEvent<"All" | JobStatus>,
  ) => {
    setIsLoadingJobs(true);
    setPageNumber(1);
    setStatusFilter(event.target.value as "All" | JobStatus);
  };

  const handlePageChange = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setIsLoadingJobs(true);
    setPageNumber(newPage + 1);
  };

  const handlePageSizeChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setIsLoadingJobs(true);
    setPageNumber(1);
    setPageSize(Number(event.target.value));
  };

  const handleOpenJobDetails = (jobPost: JobItem) => {
    setSelectedJobId(jobPost.jobId);
  };

  const handleOpenStatusMenu = (
    event: React.MouseEvent<HTMLElement>,
    jobPost: JobItem,
  ) => {
    setStatusMenuAnchor(event.currentTarget);
    setStatusMenuJob(jobPost);
  };

  const handleCloseStatusMenu = () => {
    setStatusMenuAnchor(null);
    setStatusMenuJob(null);
  };

  const handleSelectStatus = (newStatus: JobStatus) => {
    if (!statusMenuJob) {
      return;
    }

    setPendingStatusUpdate({ job: statusMenuJob, newStatus });
    handleCloseStatusMenu();
  };

  const handleCancelStatusUpdate = () => {
    setPendingStatusUpdate(null);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!pendingStatusUpdate) {
      return;
    }

    const { job, newStatus } = pendingStatusUpdate;

    await updateJobStatus(job.jobId, newStatus);
    setJobPosts((current) =>
      current.map((jobPost) =>
        jobPost.jobId === job.jobId
          ? { ...jobPost, jobStatus: newStatus }
          : jobPost,
      ),
    );
    setToastMessage(`Job status updated to ${newStatus}.`);
    setToastOpen(true);
  };

  const handleOpenCreateJob = () => {
    setEditingJobId(null);
    setEditingJobValues(null);
    setCreateJobModalKey((key) => key + 1);
    setCreateJobOpen(true);
  };

  const handleOpenEditJob = async (jobPost: JobItem) => {
    setLoadingEditJobId(jobPost.jobId);
    try {
      const details = await getJobDetails(jobPost.jobId);
      setEditingJobId(jobPost.jobId);
      setEditingJobValues(mapJobDetailsToFormValues(details));
      setCreateJobModalKey((key) => key + 1);
      setCreateJobOpen(true);
    } catch (error) {
      console.error("Failed to load job details for editing:", error);
      setToastMessage("Failed to load job details. Please try again.");
      setToastOpen(true);
    } finally {
      setLoadingEditJobId(null);
    }
  };

  const handleCloseCreateJob = () => {
    setCreateJobOpen(false);
  };

  const handleSubmitJobForm = async () => {
    const wasEditing = Boolean(editingJobId);
    setCreateJobOpen(false);
    await fetchJobPosts();
    setToastMessage(
      wasEditing
        ? "Job post updated successfully."
        : "Job post created successfully.",
    );
    setToastOpen(true);
  };

  const renderJobListContent = () => {
    if (isLoadingJobs) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={32} sx={{ color: "#1f80b6" }} />
        </Box>
      );
    }

    if (jobPosts.length === 0) {
      return (
        <Paper
          elevation={0}
          sx={{
            mt: 2.2,
            p: { xs: 2, sm: 2.5 },
            border: "1px dashed #c9ddec",
            borderRadius: 2.5,
            textAlign: "center",
            bgcolor: "#fbfeff",
          }}
        >
          <Typography sx={{ color: "#1d4f72", fontWeight: 700 }}>
            No job posts yet
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.8 }}>
            Create your first job posting to start receiving applications.
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenCreateJob}
            sx={{
              mt: 1.4,
              textTransform: "none",
              borderRadius: 2,
              background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
              "&:hover": {
                background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
              },
            }}
          >
            + Create Job Post
          </Button>
        </Paper>
      );
    }

    if (visibleJobPosts.length === 0) {
      return (
        <Stack spacing={1.2} sx={{ mt: 2.2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 1.8,
              borderRadius: 2,
              border: "1px solid #deebf6",
              bgcolor: "#fcfeff",
            }}
          >
            <Typography sx={{ color: "#52718c" }}>
              No job posts matched your search/filter.
            </Typography>
          </Paper>
        </Stack>
      );
    }

    return (
      <Box
        sx={{
          mt: 2.2,
          height: JOBS_TABLE_HEIGHT,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          pr: 0.5,
        }}
      >
        <Stack spacing={1.2}>
          {visibleJobPosts.map((jobPost) => {
            const statusStyle = getStatusChipStyle(jobPost.jobStatus);

            return (
              <Paper
                key={jobPost.jobId}
                elevation={0}
                sx={{
                  p: { xs: 1.25, sm: 1.6 },
                  borderRadius: 2.4,
                  border: "1px solid #dceaf5",
                  bgcolor: "#ffffff",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.2,
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Button
                      variant="text"
                      onClick={() => handleOpenJobDetails(jobPost)}
                      sx={{
                        p: 0,
                        minWidth: 0,
                        textTransform: "none",
                        justifyContent: "flex-start",
                        fontWeight: 700,
                        color: "#17456a",
                        fontSize: "1.05rem",
                        lineHeight: 1.2,
                        textAlign: "left",
                        "&:hover": {
                          backgroundColor: "transparent",
                          color: "#1f80b6",
                        },
                      }}
                    >
                      {jobPost.jobTitle}
                    </Button>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ mt: 0.9, flexWrap: "wrap" }}
                    >
                      <Chip
                        size="small"
                        label={jobPost.jobStatus}
                        variant="outlined"
                        sx={{
                          color: statusStyle.color,
                          borderColor: statusStyle.borderColor,
                          bgcolor: statusStyle.backgroundColor,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: "#567792" }}>
                        {`${jobPost.applicantCount} ${jobPost.applicantCount > 1 ? "Applicants" : "Applicant"}`}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#567792" }}>
                        Posted {formatPostedDate(jobPost.createdAt)}
                      </Typography>
                    </Stack>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={0.8}
                    useFlexGap
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Button
                      href={`/hr/candidates/profile?jobId=${jobPost.jobId}`}
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                      View Applicants
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleOpenApplicationForm(jobPost)}
                      sx={{
                        textTransform: "none",
                        borderRadius: 2,
                        fontWeight: 600,
                        background:
                          "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                        "&:hover": {
                          background:
                            "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                        },
                      }}
                    >
                      Application Form
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenEditJob(jobPost)}
                      disabled={loadingEditJobId === jobPost.jobId}
                      startIcon={
                        loadingEditJobId === jobPost.jobId ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : undefined
                      }
                      sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      aria-label={`More actions for ${jobPost.jobTitle}`}
                      onClick={(event) => handleOpenStatusMenu(event, jobPost)}
                      sx={{ border: "1px solid #d8e8f4", borderRadius: 2 }}
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2.2, md: 3 },
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1.2,
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "#17456a",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Job Posts
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
            Manage your job openings and applicant flow.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleOpenCreateJob}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 700,
            px: 2,
            background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
            "&:hover": {
              background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
            },
          }}
        >
          + Create Job Post
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          mt: 2.2,
          p: { xs: 1.25, sm: 1.5 },
          borderRadius: 2,
          border: "1px solid #deebf6",
          bgcolor: "#f9fcff",
        }}
      >
        <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 1.1 }}>
          Recruitment Flow
        </Typography>
        <Stack
          direction="row"
          spacing={0.8}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          {FLOW_STEPS.map((step, index) => (
            <Box key={step} sx={{ display: "flex", alignItems: "center" }}>
              <Chip
                label={step}
                size="small"
                variant="outlined"
                sx={{ borderColor: "#d4e5f3", bgcolor: "#ffffff" }}
              />
              {index < FLOW_STEPS.length - 1 && (
                <Typography sx={{ px: 0.6, color: "#8aa4b7" }}>
                  {"->"}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Box
        sx={{
          mt: 2.2,
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", md: "1fr 220px" },
        }}
      >
        <TextField
          size="small"
          label="Search job posts..."
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          fullWidth
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          fullWidth
        >
          {JOB_STATUS.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {renderJobListContent()}

      {!isLoadingJobs && jobPosts.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
          <TablePagination
            component="div"
            count={totalJobCount}
            page={pageNumber - 1}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={JOBS_PAGE_SIZE_OPTIONS}
            sx={{ color: "#567792" }}
          />
        </Box>
      )}

      <ApplicationFormModal
        open={Boolean(applicationFormJob)}
        jobTitle={applicationFormJob?.jobTitle ?? ""}
        applicationLink={applicationLink}
        fullApplicationLink={fullApplicationLink}
        recipientEmail={recipientEmail}
        onRecipientEmailChange={setRecipientEmail}
        onGenerateLink={handleGenerateLink}
        onCopyLink={handleCopyLink}
        onSendEmail={handleSendEmail}
        onClose={() => setApplicationFormJob(null)}
      />

      <ViewJob
        jobId={selectedJobId}
        open={selectedJobId !== null}
        onClose={() => setSelectedJobId(null)}
      />

      <JobModalForm
        key={createJobModalKey}
        open={createJobOpen}
        isEditing={Boolean(editingJobId)}
        jobId={editingJobId}
        initialValues={editingJobValues}
        onClose={handleCloseCreateJob}
        onSubmit={handleSubmitJobForm}
      />

      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleCloseStatusMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            px: 2,
            pt: 0.5,
            pb: 0.8,
            color: "#7893a8",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          Update Status
        </Typography>
        {(["Open", "Closed", "Draft"] as JobStatus[]).map((status) => (
          <MenuItem
            key={status}
            selected={statusMenuJob?.jobStatus === status}
            onClick={() => handleSelectStatus(status)}
          >
            <ListItemIcon sx={{ minWidth: 30 }}>
              {statusMenuJob?.jobStatus === status ? (
                <Check fontSize="small" sx={{ color: "#1f80b6" }} />
              ) : null}
            </ListItemIcon>
            <ListItemText primary={status} />
          </MenuItem>
        ))}
      </Menu>

      <ConfirmationModal
        open={Boolean(pendingStatusUpdate)}
        title="Update job status"
        description={
          pendingStatusUpdate
            ? `Change "${pendingStatusUpdate.job.jobTitle}" status to ${pendingStatusUpdate.newStatus}?`
            : undefined
        }
        confirmLabel="Update Status"
        onConfirm={handleConfirmStatusUpdate}
        onClose={handleCancelStatusUpdate}
      />

      <Snackbar
        open={toastOpen}
        autoHideDuration={2600}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
