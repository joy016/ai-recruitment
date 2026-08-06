import { Button, Paper, Stack, Typography } from "@mui/material";

export default function CandidatesPage() {
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
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#17456a" }}>
        Candidates
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
        Manage candidate records and open detailed profile data.
      </Typography>
      <Stack direction="row" sx={{ mt: 2.5 }}>
        <Button
          href="/hr/candidates/profile"
          variant="contained"
          sx={{
            width: { xs: "100%", sm: "auto" },
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 600,
            background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
            "&:hover": {
              background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
            },
          }}
        >
          Open Candidates Profile
        </Button>
      </Stack>
    </Paper>
  );
}
