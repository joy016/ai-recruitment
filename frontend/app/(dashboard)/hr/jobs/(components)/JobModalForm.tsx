"use client";

import { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { editJob, insertJob } from "@/lib/api/job";
import { EditJobPayload, InsertJobPayload } from "@/lib/types/job";
import ConfirmationModal from "@/app/component/ConfirmationModal";

export type JobStatus = "Open" | "Closed" | "Draft";

export const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;

export type EmploymentType = (typeof employmentTypes)[number];

export type JobFormValues = {
  title: string;
  location: string;
  employmentType: EmploymentType;
  department: string;
  status: JobStatus;
  description: string;
  qualifications: string[];
  techSkills: string[];
};

const emptyJobForm: JobFormValues = {
  title: "",
  location: "",
  employmentType: "Full-time",
  department: "",
  status: "Draft",
  description: "",
  qualifications: [],
  techSkills: [],
};

type JobModalFormProps = {
  open: boolean;
  isEditing: boolean;
  jobId: number | null;
  initialValues: JobFormValues | null;
  onClose: () => void;
  onSubmit: (values: JobFormValues) => void;
};

export default function JobModalForm({
  open,
  isEditing,
  jobId,
  initialValues,
  onClose,
  onSubmit,
}: Readonly<JobModalFormProps>) {
  const [jobForm, setJobForm] = useState<JobFormValues>(
    () => initialValues ?? emptyJobForm,
  );
  const [qualificationInput, setQualificationInput] = useState("");
  const [techSkillInput, setTechSkillInput] = useState("");
  const [jobFormError, setJobFormError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<JobFormValues | null>(
    null,
  );

  const handleAddQualification = () => {
    const trimmed = qualificationInput.trim();
    if (!trimmed) {
      return;
    }

    setJobForm((current) => ({
      ...current,
      qualifications: [...current.qualifications, trimmed],
    }));
    setQualificationInput("");
  };

  const handleRemoveQualification = (index: number) => {
    setJobForm((current) => ({
      ...current,
      qualifications: current.qualifications.filter((_, i) => i !== index),
    }));
  };

  const handleAddTechSkill = () => {
    const trimmed = techSkillInput.trim();
    if (!trimmed || jobForm.techSkills.includes(trimmed)) {
      setTechSkillInput("");
      return;
    }

    setJobForm((current) => ({
      ...current,
      techSkills: [...current.techSkills, trimmed],
    }));
    setTechSkillInput("");
  };

  const handleRemoveTechSkill = (skill: string) => {
    setJobForm((current) => ({
      ...current,
      techSkills: current.techSkills.filter((item) => item !== skill),
    }));
  };

  const buildPayload = (
    jobData: JobFormValues,
  ): InsertJobPayload | EditJobPayload => ({
    jobTitle: jobData.title,
    location: jobData.location,
    jobType: jobData.employmentType,
    jobStatus: jobData.status,
    jobDescription: jobData.description,
    qualifications: jobData.qualifications,
    techSkills: jobData.techSkills,
    department: jobData.department,
  });

  const describeError = (error: unknown, fallbackMessage: string) => {
    if (axios.isAxiosError<{ title?: string; message?: string }>(error)) {
      const statusCode = error.response?.status;
      const backendMessage =
        error.response?.data?.title ?? error.response?.data?.message;
      return backendMessage
        ? `${backendMessage} (code ${statusCode ?? "unknown"})`
        : fallbackMessage;
    }

    return fallbackMessage;
  };

  const handleRequestSubmit = () => {
    if (!jobForm.title.trim() || !jobForm.description.trim()) {
      setJobFormError("Job title and description are required.");
      return;
    }

    if (isEditing && !jobId) {
      setJobFormError("Missing job reference. Please close and retry.");
      return;
    }

    const finalValues: JobFormValues = {
      ...jobForm,
      title: jobForm.title.trim(),
      location: jobForm.location.trim() || "Remote",
      description: jobForm.description.trim(),
    };

    setJobFormError("");
    setPendingValues(finalValues);
    setConfirmOpen(true);
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    setPendingValues(null);
  };

  const handleConfirmSave = async () => {
    if (!pendingValues) {
      return;
    }

    if (isEditing && !jobId) {
      throw new Error("Missing job reference. Please close and retry.");
    }

    try {
      if (isEditing) {
        await editJob(jobId as number, buildPayload(pendingValues));
      } else {
        await insertJob(buildPayload(pendingValues));
      }
    } catch (error) {
      const fallbackMessage = isEditing
        ? "Failed to update job post. Please try again."
        : "Failed to create job post. Please try again.";
      console.error("Failed to save job post:", error);
      throw new Error(describeError(error, fallbackMessage));
    }

    onSubmit(pendingValues);
    setPendingValues(null);
  };

  jobForm;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          pb: 1.1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
            {isEditing ? "Edit Job Post" : "Create Job Post"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
            {isEditing
              ? "Update the details for this job opening."
              : "Fill in the details for the new job opening."}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close job form"
          onClick={onClose}
          size="small"
          sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: "16px !important" }}>
        <Stack spacing={1.4}>
          <TextField
            size="small"
            label="Job Title"
            value={jobForm.title}
            onChange={(event) =>
              setJobForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            required
            fullWidth
          />

          <Box
            sx={{
              display: "grid",
              gap: 1.3,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <TextField
              size="small"
              label="Location"
              placeholder="e.g. Remote, Onsite - Manila"
              value={jobForm.location}
              onChange={(event) =>
                setJobForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              fullWidth
            />

            <Select
              size="small"
              value={jobForm.employmentType}
              onChange={(event) =>
                setJobForm((current) => ({
                  ...current,
                  employmentType: event.target.value as EmploymentType,
                }))
              }
              fullWidth
            >
              {employmentTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Department
            </Typography>
            <Select
              size="small"
              value={jobForm.department}
              onChange={(event) =>
                setJobForm((current) => ({
                  ...current,
                  department: event.target.value as string,
                }))
              }
              fullWidth
            >
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
            </Select>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Status
            </Typography>
            <Select
              size="small"
              value={jobForm.status}
              onChange={(event) =>
                setJobForm((current) => ({
                  ...current,
                  status: event.target.value as JobStatus,
                }))
              }
              fullWidth
            >
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </Select>
          </Box>

          <TextField
            size="small"
            label="Job Description"
            value={jobForm.description}
            onChange={(event) =>
              setJobForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            multiline
            minRows={3}
            required
            fullWidth
          />

          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Qualifications
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Add a qualification"
                value={qualificationInput}
                onChange={(event) => setQualificationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddQualification();
                  }
                }}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleAddQualification}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Add
              </Button>
            </Stack>

            {jobForm.qualifications.length > 0 && (
              <Stack spacing={0.7} sx={{ mt: 1.1 }}>
                {jobForm.qualifications.map((qualification, index) => (
                  <Box
                    key={`${qualification}-${index}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      px: 1.2,
                      py: 0.6,
                      borderRadius: 1.6,
                      border: "1px solid #dcecf8",
                      bgcolor: "#f9fcff",
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "#476883" }}>
                      - {qualification}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label={`Remove ${qualification}`}
                      onClick={() => handleRemoveQualification(index)}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Tech Skills
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="e.g. React, Node.js, SQL"
                value={techSkillInput}
                onChange={(event) => setTechSkillInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTechSkill();
                  }
                }}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleAddTechSkill}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Add
              </Button>
            </Stack>

            {jobForm.techSkills.length > 0 && (
              <Stack
                direction="row"
                spacing={0.8}
                useFlexGap
                sx={{ flexWrap: "wrap", mt: 1.1 }}
              >
                {jobForm.techSkills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    size="small"
                    onDelete={() => handleRemoveTechSkill(skill)}
                    sx={{
                      bgcolor: "#e9f5ff",
                      color: "#1f80b6",
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {jobFormError && <Alert severity="error">{jobFormError}</Alert>}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 1.6 }}>
        <Button variant="text" onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleRequestSubmit}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 700,
            background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
            "&:hover": {
              background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
            },
          }}
        >
          {isEditing ? "Save Changes" : "Create Job Post"}
        </Button>
      </DialogActions>

      <ConfirmationModal
        open={confirmOpen}
        title={isEditing ? "Save changes?" : "Create job post?"}
        description={
          isEditing
            ? `Save changes to "${pendingValues?.title}"?`
            : `Create the job post "${pendingValues?.title}"?`
        }
        confirmLabel={isEditing ? "Save Changes" : "Create Job Post"}
        onConfirm={handleConfirmSave}
        onClose={handleCancelConfirm}
      />
    </Dialog>
  );
}
