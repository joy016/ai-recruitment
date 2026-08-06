import { Box, Grid, Paper, Typography } from "@mui/material";

const statCards = [
  { label: "Open Jobs", value: "12" },
  { label: "New Applicants", value: "84" },
  { label: "Interviews Today", value: "6" },
];

export default function HrDashboardPage() {
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
                p: { xs: 1.5, sm: 2.5 },
                borderRadius: 3,
                border: "1px solid #d7e8f5",
                backgroundColor: "#ffffff",
              }}
            >
              <Typography variant="body2" sx={{ color: "#5f8199" }}>
                {card.label}
              </Typography>
              <Typography
                variant="h4"
                sx={{ mt: 1.2, fontWeight: 700, color: "#1f80b6" }}
              >
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
