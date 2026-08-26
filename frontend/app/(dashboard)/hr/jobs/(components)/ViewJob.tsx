"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { getJobDetails } from "@/lib/api/job";
import { JobDetailsResponse } from "@/lib/types/job";

type ViewJobProps = {
  jobId: number | null;
  open: boolean;
  onClose: () => void;
};

const ViewJob = ({ jobId, open, onClose }: Readonly<ViewJobProps>) => {
  const [jobDetails, setJobDetails] = useState<JobDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || jobId === null) {
      return;
    }

    let isCancelled = false;

    const fetchJobDetails = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const res = await getJobDetails(jobId);
        if (!isCancelled) {
          setJobDetails(res);
        }
      } catch (error) {
        console.error("Error fetching job details:", error);
        if (!isCancelled) {
          setErrorMessage("Failed to load job details. Please try again.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchJobDetails();

    return () => {
      isCancelled = true;
    };
  }, [open, jobId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
          {jobDetails?.jobTitle ?? "Job Details"}
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
          {jobDetails?.department ?? "Department"}
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: "16px !important" }}>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: "#1f80b6" }} />
          </Box>
        )}

        {!isLoading && errorMessage && (
          <Alert severity="error">{errorMessage}</Alert>
        )}

        {!isLoading && !errorMessage && jobDetails && (
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {jobDetails.location && (
                <Chip
                  size="small"
                  label={jobDetails.location}
                  variant="outlined"
                  sx={{ borderColor: "#d4e5f3", bgcolor: "#f9fcff" }}
                />
              )}
              {jobDetails.jobType && (
                <Chip
                  size="small"
                  label={jobDetails.jobType}
                  variant="outlined"
                  sx={{ borderColor: "#d4e5f3", bgcolor: "#f9fcff" }}
                />
              )}
              {jobDetails.jobStatus && (
                <Chip
                  size="small"
                  label={jobDetails.jobStatus}
                  variant="outlined"
                  sx={{ borderColor: "#d4e5f3", bgcolor: "#f9fcff" }}
                />
              )}
            </Stack>

            <Box>
              <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 0.8 }}>
                Job Description
              </Typography>
              <Typography variant="body2" sx={{ color: "#476883" }}>
                {jobDetails.jobDescription}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 0.8 }}>
                Qualifications
              </Typography>
              <Stack spacing={0.6}>
                {jobDetails.qualifications.map((qualification) => (
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

            {jobDetails.techSkills.length > 0 && (
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 0.8 }}>
                  Tech Skills
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.8}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {jobDetails.techSkills.map((skill) => (
                    <Chip
                      key={skill}
                      label={skill}
                      size="small"
                      sx={{
                        bgcolor: "#e9f5ff",
                        color: "#1f80b6",
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewJob;
