"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { createCandidate } from "@/lib/api/candidate";

const allowedResumeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const maxResumeSize = 5 * 1024 * 1024;

export default function ApplicationPage() {
  const routeParams = useParams<{ token: string }>();
  const queryParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeInputKey, setResumeInputKey] = useState(0);

  const resolvedToken = routeParams.token || "N/A";
  const resolvedRole = useMemo(
    () => queryParams.get("role") || "General Application",
    [queryParams],
  );
  const resolvedJobId = useMemo(
    () => Number(queryParams.get("jobId")) || 0,
    [queryParams],
  );

  const validateResume = (file: File | null) => {
    if (!file) {
      return "Resume upload is required.";
    }

    if (!allowedResumeTypes.has(file.type)) {
      return "Resume must be a PDF, DOC, or DOCX file.";
    }

    if (file.size > maxResumeSize) {
      return "Resume must be 5MB or smaller.";
    }

    return "";
  };

  const handleResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setResumeFile(file);
    setErrorMessage("");
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setYearsOfExperience("");
    setLinkedinUrl("");
    setCoverLetter("");
    setResumeFile(null);
    setResumeInputKey((key) => key + 1);
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resumeError = validateResume(resumeFile);

    if (resumeError || !resumeFile) {
      setErrorMessage(resumeError);
      setIsSubmitted(false);
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await createCandidate({
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        yearsOfExperience: Number(yearsOfExperience) || 0,
        linkedInUrl: linkedinUrl,
        coverLetter,
        resume: resumeFile,
        role: resolvedRole,
        JobId: resolvedJobId,
      });

      setIsSubmitted(true);
      resetForm();
    } catch (error) {
      setErrorMessage("Failed to submit application. Please try again.");
      setIsSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 2.5, sm: 4.5 },
        px: 2,
        background:
          "linear-gradient(145deg, #edf7ff 0%, #f6fcff 45%, #e9f8f1 100%)",
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 3,
            border: "1px solid #d7e8f5",
            backgroundColor: "#ffffff",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#17456a",
              fontSize: { xs: "1.45rem", sm: "1.9rem" },
            }}
          >
            Applicant Form
          </Typography>

          <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
            Role: {resolvedRole}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: "#6c879d" }}>
            Reference: {resolvedToken}
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 2.5 }}
          >
            <Stack spacing={1.4}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.3,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <TextField
                  label="First Name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Last Name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.3,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Phone Number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.3,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                }}
              >
                <TextField
                  label="Years of Experience"
                  type="number"
                  value={yearsOfExperience}
                  onChange={(event) => setYearsOfExperience(event.target.value)}
                  slotProps={{ htmlInput: { min: 0, max: 60 } }}
                  required
                  fullWidth
                />
                <TextField
                  label="LinkedIn URL"
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                  fullWidth
                />
              </Box>

              <TextField
                label="Cover Letter"
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                multiline
                minRows={4}
                fullWidth
              />

              <Box>
                <Typography sx={{ fontWeight: 600, color: "#234b69", mb: 0.7 }}>
                  Upload Resume (Required)
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ textTransform: "none" }}
                >
                  Choose Resume File
                  <input
                    key={resumeInputKey}
                    type="file"
                    hidden
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeChange}
                  />
                </Button>
                <Typography variant="body2" sx={{ mt: 0.8, color: "#5f7f96" }}>
                  {resumeFile
                    ? `Selected: ${resumeFile.name}`
                    : "No file selected yet."}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#6f899e", mt: 0.4, display: "block" }}
                >
                  Accepted formats: PDF, DOC, DOCX. Max file size: 5MB.
                </Typography>
              </Box>

              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              {isSubmitted && (
                <Alert severity="success">
                  Application submitted successfully. Our HR team will review
                  your profile.
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                sx={{
                  mt: 1,
                  borderRadius: 2,
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 700,
                  background:
                    "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                  },
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
