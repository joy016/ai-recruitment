import { Paper, Typography } from "@mui/material";

export default function SettingsPage() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2.2, md: 3 },
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "#17456a",
          fontSize: { xs: "1.2rem", sm: "1.5rem" },
        }}
      >
        Settings
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
        Configure account, permissions, and recruitment preferences.
      </Typography>
    </Paper>
  );
}
