"use client";

import { useMemo } from "react";
import { Chip } from "@mui/material";
import { JobItem } from "@/lib/types/job";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { CommonTableColumn } from "@/app/component/CommonTable";
import { NewCandidates } from "../../candidates/(types)/candidates.types";

export const useJobColumns = (): CommonTableColumn<JobItem>[] =>
  useMemo(
    () => [
      {
        key: "jobTitle",
        label: "Job Title",
        render: (job) => job.jobTitle,
        secondary: (job) => `JOB-00${job.jobId}`,
      },
      {
        key: "department",
        label: "Department",
        render: (job) => job.department,
      },
      {
        key: "applicantCount",
        label: "Applicants",
        render: (job) => job.applicantCount,
      },
      {
        key: "jobStatus",
        label: "Status",
        render: (job) => (
          <Chip
            label={job.jobStatus}
            size="small"
            sx={{ bgcolor: "#eef7ff", color: "#1f80b6", fontWeight: 700 }}
          />
        ),
      },
      {
        key: "createdAt",
        label: "Posted",
        render: (job) => formatRelativeTime(job.createdAt),
      },
    ],
    [],
  );

export const useApplicantsColumns = (): CommonTableColumn<NewCandidates>[] =>
  useMemo(
    () => [
      {
        key: "applicantName",
        label: "Applicant",
        render: (can) => can.candidateName,
        secondary: (can) => `APP-${can.candidateId.slice(0, 8)}`,
      },
      {
        key: "position",
        label: "Positiion",
        render: (can) => can.position,
      },
      {
        key: "appliedAt",
        label: "Applied At",
        render: (can) => formatDateTime(can.appliedDate),
      },
      {
        key: "experience",
        label: "Experience",
        render: (can) => can.workExperience,
      },
      {
        key: "source",
        label: "Source",
        render: (can) => can.applicationSource,
      },
    ],
    [],
  );
