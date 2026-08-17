"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MoreHoriz } from "@mui/icons-material";

type JobStatus = "Open" | "Closed" | "Draft";

type JobPost = {
  id: string;
  title: string;
  status: JobStatus;
  applicants: number;
  postedDate: string;
  description: string;
  qualifications: string[];
};

const jobPosts: JobPost[] = [
  {
    id: "JOB-1001",
    title: "Frontend Developer",
    status: "Open",
    applicants: 12,
    postedDate: "Aug 12, 2026",
    description:
      "Build and maintain responsive web interfaces for our AI recruitment workflows. Collaborate with product, design, and backend teams to deliver reliable user experiences.",
    qualifications: [
      "3+ years of frontend development experience",
      "Strong React and TypeScript skills",
      "Experience with API integration and state management",
      "Good understanding of responsive UI and accessibility",
    ],
  },
  {
    id: "JOB-1002",
    title: "Backend Developer",
    status: "Open",
    applicants: 8,
    postedDate: "Aug 10, 2026",
    description:
      "Develop secure and scalable backend services for candidate processing, interview workflows, and AI screening integrations.",
    qualifications: [
      "3+ years of backend development experience",
      "Strong Node.js/TypeScript or similar backend stack",
      "Experience with REST APIs and database design",
      "Knowledge of security and performance optimization",
    ],
  },
  {
    id: "JOB-1003",
    title: "HR Assistant",
    status: "Draft",
    applicants: 0,
    postedDate: "Aug 08, 2026",
    description:
      "Support recruiting operations by coordinating schedules, tracking applicants, and maintaining accurate candidate records.",
    qualifications: [
      "1+ year in HR or recruitment support",
      "Strong communication and organization skills",
      "Comfortable with applicant tracking tools",
      "Attention to detail and data accuracy",
    ],
  },
];

const flowSteps = [
  "Job Posts",
  "Select a Job",
  "Application Form",
  "Generate / Copy / Send Link",
  "Applicant Submits",
  "AI Screening",
  "Candidates",
];

const getStatusChipStyle = (status: JobStatus) => {
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

export default function JobsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | JobStatus>("All");
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<JobPost | null>(
    null,
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [generatedTokenByJobId, setGeneratedTokenByJobId] = useState<
    Record<string, string>
  >({});
  const [toastMessage, setToastMessage] = useState(
    "Application link generated and copied.",
  );
  const [toastOpen, setToastOpen] = useState(false);

  const applicationLink = useMemo(() => {
    if (!selectedJob) {
      return "";
    }

    const generatedToken = generatedTokenByJobId[selectedJob.id];
    if (!generatedToken) {
      return "";
    }

    const query = new URLSearchParams({
      role: selectedJob.title || "General Application",
      recipient: recipientEmail || "",
    });

    return `/apply/${generatedToken}?${query.toString()}`;
  }, [generatedTokenByJobId, recipientEmail, selectedJob]);

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
        jobPost.title.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || jobPost.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchKeyword, statusFilter]);

  const createToken = () => {
    const randomPart = crypto.getRandomValues(new Uint32Array(2));
    const segmentA = randomPart[0].toString(36).toUpperCase();
    const segmentB = randomPart[1].toString(36).toUpperCase();
    return `APPFORM-${segmentA}${segmentB}`;
  };

  const ensureJobToken = (jobId: string) => {
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

  const handleOpenApplicationForm = (jobPost: JobPost) => {
    ensureJobToken(jobPost.id);
    setRecipientEmail("");
    setSelectedJob(jobPost);
  };

  const handleGenerateLink = async () => {
    if (!selectedJob) {
      return;
    }

    const token = createToken();
    setGeneratedTokenByJobId((current) => ({
      ...current,
      [selectedJob.id]: token,
    }));

    const query = new URLSearchParams({
      role: selectedJob.title || "General Application",
      recipient: recipientEmail,
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
    if (!fullApplicationLink || !recipientEmail.trim() || !selectedJob) {
      return;
    }

    const subject = encodeURIComponent(
      `${selectedJob.title} - Application Form`,
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
    setStatusFilter(event.target.value as "All" | JobStatus);
  };

  const handleOpenJobDetails = (jobPost: JobPost) => {
    setSelectedJobDetails(jobPost);
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
          {flowSteps.map((step, index) => (
            <Box key={step} sx={{ display: "flex", alignItems: "center" }}>
              <Chip
                label={step}
                size="small"
                variant="outlined"
                sx={{ borderColor: "#d4e5f3", bgcolor: "#ffffff" }}
              />
              {index < flowSteps.length - 1 && (
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
          <MenuItem value="All">All Status</MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="Closed">Closed</MenuItem>
          <MenuItem value="Draft">Draft</MenuItem>
        </Select>
      </Box>

      {jobPosts.length === 0 ? (
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
      ) : (
        <Stack spacing={1.2} sx={{ mt: 2.2 }}>
          {visibleJobPosts.length === 0 ? (
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
          ) : (
            visibleJobPosts.map((jobPost) => {
              const statusStyle = getStatusChipStyle(jobPost.status);

              return (
                <Paper
                  key={jobPost.id}
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
                        {jobPost.title}
                      </Button>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{ mt: 0.9, flexWrap: "wrap" }}
                      >
                        <Chip
                          size="small"
                          label={jobPost.status}
                          variant="outlined"
                          sx={{
                            color: statusStyle.color,
                            borderColor: statusStyle.borderColor,
                            bgcolor: statusStyle.backgroundColor,
                          }}
                        />
                        <Typography variant="body2" sx={{ color: "#567792" }}>
                          {jobPost.applicants} Applicants
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#567792" }}>
                          Posted {jobPost.postedDate}
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
                        href="/hr/candidates/profile"
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
                        sx={{ textTransform: "none", borderRadius: 2 }}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        aria-label={`More actions for ${jobPost.title}`}
                        sx={{ border: "1px solid #d8e8f4", borderRadius: 2 }}
                      >
                        <MoreHoriz fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Paper>
              );
            })
          )}
        </Stack>
      )}

      <Dialog
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1.1 }}>
          <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
            Application Form
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
            {selectedJob?.title}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: "16px !important" }}>
          <Stack spacing={1.4}>
            <Typography sx={{ fontWeight: 700, color: "#1d4f72" }}>
              Application Form Link
            </Typography>

            <TextField
              size="small"
              label="Form Link"
              value={fullApplicationLink}
              slotProps={{ input: { readOnly: true } }}
              fullWidth
            />

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Button
                variant="contained"
                onClick={handleCopyLink}
                disabled={!applicationLink}
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  background:
                    "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                  },
                }}
              >
                Copy Link
              </Button>
              <Button
                variant="outlined"
                href={applicationLink || undefined}
                target="_blank"
                rel="noreferrer"
                disabled={!applicationLink}
                size="small"
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Open Form
              </Button>
              <Button
                variant="text"
                onClick={handleGenerateLink}
                size="small"
                sx={{ textTransform: "none" }}
              >
                Generate New Link
              </Button>
            </Stack>

            <Divider sx={{ my: 0.5 }} />

            <Typography sx={{ fontWeight: 700, color: "#1d4f72" }}>
              Send directly to applicant
            </Typography>

            <TextField
              size="small"
              label="Applicant Email"
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              fullWidth
            />

            <Button
              variant="outlined"
              onClick={handleSendEmail}
              disabled={!applicationLink || !recipientEmail.trim()}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                width: "fit-content",
              }}
            >
              Send via Email
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedJobDetails)}
        onClose={() => setSelectedJobDetails(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
            {selectedJobDetails?.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
            Job Details
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: "16px !important" }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 0.8 }}>
                Job Description
              </Typography>
              <Typography variant="body2" sx={{ color: "#476883" }}>
                {selectedJobDetails?.description}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 0.8 }}>
                Qualifications
              </Typography>
              <Stack spacing={0.6}>
                {selectedJobDetails?.qualifications.map((qualification) => (
                  <Typography
                    key={qualification}
                    variant="body2"
                    sx={{ color: "#476883" }}
                  >
                    - {qualification}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

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
