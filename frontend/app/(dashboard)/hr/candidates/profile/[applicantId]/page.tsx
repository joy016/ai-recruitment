import { Paper, Typography } from "@mui/material";
import ResumeViewer from "../../(components)/ResumeViewer";

type CandidateResumePageProps = {
  params: Promise<{ applicantId: string }>;
};

export default async function CandidateResumePage({
  params,
}: CandidateResumePageProps) {
  const { applicantId } = await params;

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

      <ResumeViewer applicantId={applicantId} />
    </Paper>
  );
}
