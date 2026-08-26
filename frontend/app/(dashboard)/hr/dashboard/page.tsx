"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { JOBS_PAGE_SIZE } from "@/app/(constants)/job";
import { JobItem } from "@/lib/types/job";
import { getAllJobs } from "@/lib/api/job";
import { formatRelativeTime } from "@/lib/utils/date";
import CommonTable, { CommonTableColumn } from "@/app/component/CommonTable";

const newApplicants = [
  {
    id: "APP-1016",
    name: "Isabella Rivera",
    position: "Frontend Developer",
    appliedAt: "8:05 AM",
    experience: "3 years",
    source: "LinkedIn",
  },
  {
    id: "APP-1017",
    name: "Noah Garcia",
    position: "Backend Developer",
    appliedAt: "9:10 AM",
    experience: "5 years",
    source: "Company Website",
  },
  {
    id: "APP-1018",
    name: "Mia Flores",
    position: "QA Engineer",
    appliedAt: "10:25 AM",
    experience: "4 years",
    source: "Referral",
  },
  {
    id: "APP-1019",
    name: "Liam Bautista",
    position: "UI/UX Designer",
    appliedAt: "11:40 AM",
    experience: "2 years",
    source: "JobStreet",
  },
];

const interviewSchedule = [
  {
    id: "APP-1001",
    candidateName: "Sarah Jones",
    role: "Frontend Developer",
    stage: "Initial Interview",
    time: "9:30 AM",
    interviewer: "Maria Santos",
    mode: "Google Meet",
  },
  {
    id: "APP-1002",
    candidateName: "Mark Daniel",
    role: "Backend Developer",
    stage: "Technical Interview",
    time: "11:00 AM",
    interviewer: "Kevin Lim",
    mode: "Zoom",
  },
  {
    id: "APP-1008",
    candidateName: "Alyssa Cruz",
    role: "UI/UX Designer",
    stage: "Final Interview",
    time: "1:30 PM",
    interviewer: "Jenna Reyes",
    mode: "On-site",
  },
  {
    id: "APP-1010",
    candidateName: "Daniel Perez",
    role: "QA Engineer",
    stage: "Initial Interview",
    time: "3:00 PM",
    interviewer: "Chris Ong",
    mode: "Google Meet",
  },
  {
    id: "APP-1012",
    candidateName: "Nicole Tan",
    role: "Product Analyst",
    stage: "HR Interview",
    time: "4:15 PM",
    interviewer: "Pam Velasco",
    mode: "Microsoft Teams",
  },
  {
    id: "APP-1015",
    candidateName: "Jason Lee",
    role: "Recruitment Associate",
    stage: "Final Interview",
    time: "5:00 PM",
    interviewer: "Angela Cruz",
    mode: "On-site",
  },
];

export default function HrDashboardPage() {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [jobPageSize, setJobPageSize] = useState(JOBS_PAGE_SIZE);
  const [jobPageNumber, setJobPageNumber] = useState(1);
  const [totalJobCount, setTotalJobCount] = useState(0);
  const [jobPosts, setJobPosts] = useState<JobItem[]>([]);
  const [isLoadingOpenJobs, setIsLoadingOpenJobs] = useState(true);

  const statCards = useMemo(
    () => [
      {
        label: "Open Jobs",
        value: String(totalJobCount),
        isLoading: isLoadingOpenJobs,
      },
      {
        label: "New Applicants",
        value: String(newApplicants.length),
        isLoading: false,
      },
      {
        label: "Interviews Today",
        value: String(interviewSchedule.length),
        isLoading: false,
      },
    ],
    [totalJobCount, isLoadingOpenJobs],
  );

  const jobColumns: CommonTableColumn<JobItem>[] = useMemo(
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

  const fetchInitialOpenJobs = async () => {
    try {
      const response = await getAllJobs("Open", jobPageNumber, jobPageSize);
      setJobPosts(response.data);
      setTotalJobCount(response.applicantCount || 0);
    } catch (error) {
      console.error("Failed to fetch open jobs:", error);
    } finally {
      setIsLoadingOpenJobs(false);
    }
  };

  useEffect(() => {
    fetchInitialOpenJobs();
  }, [jobPageNumber, jobPageSize]);

  const handleJobPageChange = (nextPageNumber: number) => {
    setIsLoadingOpenJobs(true);
    setJobPageNumber(nextPageNumber);
  };

  const handleJobPageSizeChange = (nextPageSize: number) => {
    setIsLoadingOpenJobs(true);
    setJobPageNumber(1);
    setJobPageSize(nextPageSize);
  };

  const handleCardClick = (label: string) => {
    const isOpening = activeCard !== label;
    setActiveCard(isOpening ? label : null);
  };

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: "#17456a",
          mb: 0.8,
          fontSize: { xs: "1.45rem", sm: "2rem" },
        }}
      >
        Welcome, HR Team
      </Typography>
      <Typography variant="body1" sx={{ color: "#52718c", mb: 3 }}>
        Track your hiring pipeline and manage recruitment activities.
      </Typography>

      <Grid container spacing={2.2}>
        {statCards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border:
                  card.label === activeCard
                    ? "1px solid #8fc7e4"
                    : "1px solid #d7e8f5",
                backgroundColor: "#ffffff",
                overflow: "hidden",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
                boxShadow:
                  card.label === activeCard
                    ? "0 10px 24px rgba(31, 128, 182, 0.12)"
                    : "none",
              }}
            >
              <ButtonBase
                onClick={() => handleCardClick(card.label)}
                sx={{
                  width: "100%",
                  display: "block",
                  textAlign: "left",
                  p: { xs: 1.5, sm: 2.5 },
                  "&:hover": {
                    bgcolor: "#f7fbff",
                  },
                }}
              >
                <Stack direction="row" spacing={1.2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: "#5f8199" }}>
                      {card.label}
                    </Typography>
                    {card.isLoading ? (
                      <Box
                        sx={{ mt: 1.2, display: "flex", alignItems: "center" }}
                      >
                        <CircularProgress size={26} sx={{ color: "#1f80b6" }} />
                      </Box>
                    ) : (
                      <Typography
                        variant="h4"
                        sx={{ mt: 1.2, fontWeight: 700, color: "#1f80b6" }}
                      >
                        {card.value}
                      </Typography>
                    )}
                  </Box>

                  <Chip
                    icon={
                      card.label === activeCard ? (
                        <ExpandLess />
                      ) : (
                        <ExpandMore />
                      )
                    }
                    label={card.label === activeCard ? "Hide" : "View"}
                    size="small"
                    sx={{
                      mt: 0.2,
                      bgcolor: "#e9f5ff",
                      color: "#1f80b6",
                      fontWeight: 700,
                    }}
                  />
                </Stack>
              </ButtonBase>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {activeCard === "Open Jobs" ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2.4,
            borderRadius: 3,
            border: "1px solid #d7e8f5",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: 2,
              borderBottom: "1px solid #e5f0f7",
              background: "linear-gradient(180deg, #f9fcff 0%, #f3faff 100%)",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#17456a" }}>
              Open Job Posts
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
              Monitor active openings, department demand, and applicant volume.
            </Typography>
          </Box>

          <CommonTable
            columns={jobColumns}
            data={jobPosts}
            getRowKey={(a) => a.jobId}
            pageSize={jobPageSize}
            pageNumber={jobPageNumber}
            totalCount={totalJobCount}
            onPageChange={handleJobPageChange}
            onPageSizeChange={handleJobPageSizeChange}
          />
        </Paper>
      ) : null}

      {activeCard === "New Applicants" ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2.4,
            borderRadius: 3,
            border: "1px solid #d7e8f5",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: 2,
              borderBottom: "1px solid #e5f0f7",
              background: "linear-gradient(180deg, #f9fcff 0%, #f3faff 100%)",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#17456a" }}>
              New Applicants
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
              Review the latest candidates entering the hiring pipeline today.
            </Typography>
          </Box>

          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f7fbfe" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Applicant
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Position
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Applied At
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Experience
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Source
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {newApplicants.map((applicant) => (
                  <TableRow key={applicant.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#244964" }}>
                        {applicant.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6b879c" }}>
                        {applicant.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{applicant.position}</TableCell>
                    <TableCell>{applicant.appliedAt}</TableCell>
                    <TableCell>{applicant.experience}</TableCell>
                    <TableCell>{applicant.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      {activeCard === "Interviews Today" ? (
        <Paper
          elevation={0}
          sx={{
            mt: 2.4,
            borderRadius: 3,
            border: "1px solid #d7e8f5",
            backgroundColor: "#ffffff",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              py: 2,
              borderBottom: "1px solid #e5f0f7",
              background: "linear-gradient(180deg, #f9fcff 0%, #f3faff 100%)",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#17456a" }}>
              Interview Schedule Today
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
              Review today&apos;s candidates, interview stage, assigned
              interviewer, and meeting channel.
            </Typography>
          </Box>

          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f7fbfe" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Candidate
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Position
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Stage
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Time
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Interviewer
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Mode
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {interviewSchedule.map((interview) => (
                  <TableRow key={interview.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#244964" }}>
                        {interview.candidateName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6b879c" }}>
                        {interview.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{interview.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={interview.stage}
                        size="small"
                        sx={{
                          bgcolor: "#eef7ff",
                          color: "#1f80b6",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>{interview.time}</TableCell>
                    <TableCell>{interview.interviewer}</TableCell>
                    <TableCell>{interview.mode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}
    </Box>
  );
}
