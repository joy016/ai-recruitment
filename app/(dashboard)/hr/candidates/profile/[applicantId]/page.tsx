import { Box, Button, Paper, Typography } from "@mui/material";

type CandidateResumePageProps = {
  params: Promise<{ applicantId: string }>;
};

export default async function CandidateResumePage({
  params,
}: CandidateResumePageProps) {
  const { applicantId } = await params;
  const demoResumePath = "/EDIJOY_LEJAS-RESUME%20-%20Edijoy%20Lejas.pdf";

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.25, sm: 2.2, md: 3 },
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
        Candidate Resume
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
        Applicant ID: {applicantId}
      </Typography>

      <Box
        sx={{
          mt: 2.2,
          borderRadius: 2,
          border: "1px solid #d9e9f5",
          bgcolor: "#f8fcff",
          overflow: "hidden",
        }}
      >
        <Box
          component="iframe"
          title={`Resume preview for ${applicantId}`}
          src={demoResumePath}
          sx={{
            width: "100%",
            height: { xs: 460, sm: 560, md: 760 },
            border: 0,
            backgroundColor: "#ffffff",
          }}
        />
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gap: 1.2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(auto-fit, minmax(210px, 1fr))",
          },
        }}
      >
        <Button
          href={demoResumePath}
          target="_blank"
          rel="noreferrer"
          variant="contained"
          sx={{ textTransform: "none", bgcolor: "#1f80b6", width: "100%" }}
        >
          Open Demo Resume
        </Button>
        <Button
          href={demoResumePath}
          download
          variant="outlined"
          sx={{
            textTransform: "none",
            width: "100%",
            borderColor: "#9cc7df",
            color: "#1f80b6",
          }}
        >
          Download Resume
        </Button>
        <Button
          href="/hr/candidates/profile"
          variant="outlined"
          sx={{
            textTransform: "none",
            width: "100%",
            borderColor: "#9cc7df",
            color: "#1f80b6",
          }}
        >
          Back to Candidates Profile
        </Button>
      </Box>
    </Paper>
  );
}
