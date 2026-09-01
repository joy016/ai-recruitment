import React from "react";
import CardContainer from "@/app/component/CardContainer";
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from "@mui/material";

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

const InterviewsToday = () => {
  return (
    <CardContainer>
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
          Review today&apos;s candidates, interview stage, assigned interviewer,
          and meeting channel.
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
    </CardContainer>
  );
};

export default InterviewsToday;
