"use client";

import { useMemo, useState } from "react";
import {
  Box,
  ButtonBase,
  Chip,
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

const openJobs = [
  {
    id: "JOB-201",
    title: "Frontend Developer",
    department: "Engineering",
    applicants: 24,
    status: "Urgent",
    posted: "2 days ago",
  },
  {
    id: "JOB-202",
    title: "Backend Developer",
    department: "Engineering",
    applicants: 18,
    status: "Active",
    posted: "4 days ago",
  },
  {
    id: "JOB-203",
    title: "Product Analyst",
    department: "Product",
    applicants: 12,
    status: "Screening",
    posted: "1 week ago",
  },
  {
    id: "JOB-204",
    title: "QA Engineer",
    department: "Quality Assurance",
    applicants: 9,
    status: "Active",
    posted: "3 days ago",
  },
];

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

  const statCards = useMemo(
    () => [
      { label: "Open Jobs", value: String(openJobs.length) },
      { label: "New Applicants", value: String(newApplicants.length) },
      { label: "Interviews Today", value: String(interviewSchedule.length) },
    ],
    [],
  );

  const handleCardClick = (label: string) => {
    setActiveCard((current) => (current === label ? null : label));
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
                    <Typography
                      variant="h4"
                      sx={{ mt: 1.2, fontWeight: 700, color: "#1f80b6" }}
                    >
                      {card.value}
                    </Typography>
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

          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f7fbfe" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Job Title
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Department
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Applicants
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#264a66" }}>
                    Posted
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {openJobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#244964" }}>
                        {job.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#6b879c" }}>
                        {job.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{job.applicants}</TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        sx={{
                          bgcolor: "#eef7ff",
                          color: "#1f80b6",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>{job.posted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
