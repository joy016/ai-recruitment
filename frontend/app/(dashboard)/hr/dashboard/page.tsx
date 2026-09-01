"use client";

import { useMemo, useState } from "react";
import {
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import CardContainer from "@/app/component/CardContainer";

import OpenJobs from "./(components)/OpenJobs";
import NewApplicants from "./(components)/NewApplicants";
import InterviewsToday from "./(components)/InterviewsToday";

// Fixed-order categorical palette (identity color), validated for CVD-safe
// adjacency - see the dataviz color-formula: never cycle or reorder per chart.
const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
];

const applicantsBySourceData = [
  { id: 0, label: "LinkedIn", value: 38 },
  { id: 1, label: "Referral", value: 22 },
  { id: 2, label: "Company Website", value: 18 },
  { id: 3, label: "JobStreet", value: 14 },
  { id: 4, label: "Other", value: 8 },
];

const applicantsByStatusData = [
  { id: 0, label: "Technical Interview", value: 20 },
  { id: 1, label: "Final Interview", value: 11 },
  { id: 2, label: "Job Offer", value: 8 },
  { id: 3, label: "Hired", value: 14 },
  { id: 4, label: "Rejected", value: 25 },
];

const applicantsByJobData = [
  { job: "Frontend Developer", applicants: 24 },
  { job: "Backend Developer", applicants: 19 },
  { job: "QA Engineer", applicants: 15 },
  { job: "UI/UX Designer", applicants: 12 },
  { job: "Product Analyst", applicants: 9 },
  { job: "HR Associate", applicants: 6 },
];

const weeklyApplicationsTrend = [
  { day: "Mon", applications: 12 },
  { day: "Tue", applications: 18 },
  { day: "Wed", applications: 9 },
  { day: "Thu", applications: 22 },
  { day: "Fri", applications: 17 },
  { day: "Sat", applications: 7 },
  { day: "Sun", applications: 4 },
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const pieChartHeight = isMobile ? 320 : 260;
  const pieLegendSlotProps = {
    legend: isMobile
      ? {
          direction: "horizontal" as const,
          position: {
            vertical: "bottom" as const,
            horizontal: "center" as const,
          },
        }
      : {
          direction: "vertical" as const,
          position: { vertical: "middle" as const, horizontal: "end" as const },
        },
  };
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [totalJobCount, setTotalJobCount] = useState(0);
  const [newApplicantCount, setNewApplicantCount] = useState(0);

  const statCards = useMemo(
    () => [
      {
        label: "Open Jobs",
        value: String(totalJobCount),
        isLoading: false,
      },
      {
        label: "New Applicants",
        value: String(newApplicantCount),
        isLoading: false,
      },
      {
        label: "Interviews Today",
        value: String(interviewSchedule.length),
        isLoading: false,
      },
    ],
    [totalJobCount, newApplicantCount],
  );

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
      <OpenJobs
        setTotalJobCount={setTotalJobCount}
        totalJobCount={totalJobCount}
        isVisible={activeCard === "Open Jobs"}
      />

      <NewApplicants
        isVisible={activeCard === "New Applicants"}
        setNewApplicantCount={setNewApplicantCount}
        newApplicantCount={newApplicantCount}
      />

      {activeCard === "Interviews Today" ? <InterviewsToday /> : null}

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
            Recruitment Analytics
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
            Applicant sourcing, hiring demand by role, and weekly application
            volume. (Sample data)
          </Typography>
        </Box>

        <Grid container spacing={2.2} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#264a66", mb: 1 }}
            >
              Applicants by Source
            </Typography>
            <PieChart
              series={[
                {
                  data: applicantsBySourceData,
                  innerRadius: "42%",
                  outerRadius: "80%",
                  paddingAngle: 2,
                  cornerRadius: 3,
                  arcLabel: "value",
                  arcLabelMinAngle: 20,
                },
              ]}
              colors={CATEGORICAL_COLORS}
              height={pieChartHeight}
              slotProps={pieLegendSlotProps}
              sx={{
                "& .MuiChartsArcLabel-root": {
                  fill: "#ffffff",
                  fontWeight: 700,
                  fontSize: 12,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#264a66", mb: 1 }}
            >
              Applicants by Job
            </Typography>
            <BarChart
              dataset={applicantsByJobData}
              layout="horizontal"
              yAxis={[
                {
                  dataKey: "job",
                  scaleType: "band",
                  width: "auto",
                  tickLabelStyle: { fontSize: 11 },
                },
              ]}
              series={[{ dataKey: "applicants", color: CATEGORICAL_COLORS[0] }]}
              height={260}
              borderRadius={4}
              grid={{ vertical: true }}
              hideLegend
            />
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#264a66", mb: 1 }}
            >
              Applicants by Status
            </Typography>
            <PieChart
              series={[
                {
                  data: applicantsByStatusData,
                  innerRadius: "42%",
                  outerRadius: "80%",
                  paddingAngle: 2,
                  cornerRadius: 3,
                  arcLabel: "value",
                  arcLabelMinAngle: 20,
                },
              ]}
              colors={CATEGORICAL_COLORS}
              height={pieChartHeight}
              slotProps={pieLegendSlotProps}
              sx={{
                "& .MuiChartsArcLabel-root": {
                  fill: "#ffffff",
                  fontWeight: 700,
                  fontSize: 12,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "#264a66", mb: 1 }}
            >
              Weekly Application Volume
            </Typography>
            <LineChart
              dataset={weeklyApplicationsTrend}
              xAxis={[{ dataKey: "day", scaleType: "point" }]}
              series={[
                {
                  dataKey: "applications",
                  color: CATEGORICAL_COLORS[0],
                  area: true,
                  showMark: true,
                },
              ]}
              height={220}
              grid={{ horizontal: true }}
              hideLegend
            />
          </Grid>
        </Grid>
      </CardContainer>
    </Box>
  );
}
