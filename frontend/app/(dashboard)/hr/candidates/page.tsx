import CardContainer from "@/app/component/CardContainer";
import { Button, Stack, Typography } from "@mui/material";

type CandidatesPageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function CandidatesPage({
  searchParams,
}: Readonly<CandidatesPageProps>) {
  const { jobId } = await searchParams;
  const profileHref = jobId
    ? `/hr/candidates/profile?jobId=${jobId}`
    : "/hr/candidates/profile";

  return (
    <CardContainer>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#17456a" }}>
        Candidates
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
        Manage candidate records and open detailed profile data.
      </Typography>
      <Stack direction="row" sx={{ mt: 2.5 }}>
        <Button
          href={profileHref}
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
    </CardContainer>
  );
}
