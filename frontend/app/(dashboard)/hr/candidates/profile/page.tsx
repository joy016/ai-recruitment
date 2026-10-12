import { redirect } from "next/navigation";

type LegacyCandidatesProfilePageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

// The candidates table now lives at /hr/candidates; keep old links working.
export default async function LegacyCandidatesProfilePage({
  searchParams,
}: Readonly<LegacyCandidatesProfilePageProps>) {
  const { jobId } = await searchParams;
  redirect(
    jobId
      ? `/hr/candidates?jobId=${encodeURIComponent(jobId)}`
      : "/hr/candidates",
  );
}
