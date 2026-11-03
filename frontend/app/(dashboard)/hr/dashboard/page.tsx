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
import AnalyticsChartFrame from "./(components)/AnalyticsChartFrame";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/constant/permissions";
import { useDashboardAnalytics } from "@/lib/hooks/useDashboardAnalytics";

// Fixed-order categorical palette (identity color), validated for CVD-safe
// adjacency - see the dataviz color-formula: never cycle or reorder per chart.
const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
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
  const { hasPermission } = usePermissions();
  // Each card/widget loads its own data, so it only renders with permission.
  const canViewJobs = hasPermission(PERMISSIONS.jobPosts.view);
  const canViewCandidates = hasPermission(PERMISSIONS.candidates.view);
  const canViewInterviews = hasPermission(PERMISSIONS.interviews.view);
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
  const [interviewsTodayCount, setInterviewsTodayCount] = useState(0);

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics,
  } = useDashboardAnalytics();

  // Fixed order from the backend (always LinkedIn, Referral, Company Website, JobStreet,
  // Other) mapped 1:1 onto CATEGORICAL_COLORS by index, so a source keeps its color even at
  // a 0 count or when other counts change.
  const applicantsBySourceData = (analytics?.applicantsBySource ?? []).map(
    (item, index) => ({ id: index, label: item.label, value: item.count }),
  );
  const applicantsByStatusData = (analytics?.applicantsByStatus ?? []).map(
    (item, index) => ({ id: index, label: item.status, value: item.count }),
  );
  const applicantsByJobData = (analytics?.applicantsByJob ?? []).map((item) => ({
    job: item.jobTitle,
    applicants: item.count,
  }));
  const weeklyApplicationsTrend = (analytics?.weeklyApplicationVolume ?? []).map(
    (item) => ({ day: item.day, applications: item.count }),
  );

  const isSourceEmpty = applicantsBySourceData.every((item) => item.value === 0);
  const isStatusEmpty =
    applicantsByStatusData.length === 0 ||
    applicantsByStatusData.every((item) => item.value === 0);
  const isJobEmpty = applicantsByJobData.length === 0;
  const isWeeklyEmpty = weeklyApplicationsTrend.every(
    (item) => item.applications === 0,
  );

  const statCards = useMemo(
    () => [
      {
        label: "Open Jobs",
        value: String(totalJobCount),
        isLoading: false,
        visible: canViewJobs,
      },
      {
        label: "New Applicants",
        value: String(newApplicantCount),
        isLoading: false,
        visible: canViewCandidates,
      },
      {
        label: "Interviews Today",
        value: String(interviewsTodayCount),
        isLoading: false,
        visible: canViewInterviews,
      },
    ].filter((card) => card.visible),
    [
      totalJobCount,
      newApplicantCount,
      interviewsTodayCount,
      canViewJobs,
      canViewCandidates,
      canViewInterviews,
    ],
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
      {canViewJobs && (
        <OpenJobs
          setTotalJobCount={setTotalJobCount}
          totalJobCount={totalJobCount}
          isVisible={activeCard === "Open Jobs"}
        />
      )}

      {canViewCandidates && (
        <NewApplicants
          isVisible={activeCard === "New Applicants"}
          setNewApplicantCount={setNewApplicantCount}
          newApplicantCount={newApplicantCount}
        />
      )}

      {canViewInterviews && (
        <InterviewsToday
          isVisible={activeCard === "Interviews Today"}
          setInterviewsTodayCount={setInterviewsTodayCount}
          interviewsTodayCount={interviewsTodayCount}
        />
      )}

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
            volume.
          </Typography>
        </Box>

        <Grid container spacing={2.2} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <AnalyticsChartFrame
              title="Applicants by Source"
              height={pieChartHeight}
              isLoading={isAnalyticsLoading}
              isError={isAnalyticsError}
              isEmpty={isSourceEmpty}
              onRetry={refetchAnalytics}
            >
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
            </AnalyticsChartFrame>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <AnalyticsChartFrame
              title="Applicants by Job"
              height={260}
              isLoading={isAnalyticsLoading}
              isError={isAnalyticsError}
              isEmpty={isJobEmpty}
              onRetry={refetchAnalytics}
            >
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
            </AnalyticsChartFrame>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <AnalyticsChartFrame
              title="Applicants by Status"
              height={pieChartHeight}
              isLoading={isAnalyticsLoading}
              isError={isAnalyticsError}
              isEmpty={isStatusEmpty}
              onRetry={refetchAnalytics}
            >
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
            </AnalyticsChartFrame>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <AnalyticsChartFrame
              title="Weekly Application Volume"
              height={220}
              isLoading={isAnalyticsLoading}
              isError={isAnalyticsError}
              isEmpty={isWeeklyEmpty}
              onRetry={refetchAnalytics}
            >
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
            </AnalyticsChartFrame>
          </Grid>
        </Grid>
      </CardContainer>
    </Box>
  );
}
