"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import LinkButton from "@/app/component/LinkButton";
import { getCandidateResumeUrl } from "@/lib/api/candidate";
import { ResumeUrlResponse } from "@/lib/types/candidate";

type ResumeViewerProps = {
  applicantId: string;
};

type ViewerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; resume: ResumeUrlResponse };

const outlinedButtonSx = {
  textTransform: "none",
  width: "100%",
  borderColor: "#9cc7df",
  color: "#1f80b6",
} as const;

const getResumeErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response) {
      return "Unable to reach the server. Please check your connection and try again.";
    }
    if (error.response.status === 403) {
      return "You don't have permission to view this candidate's resume.";
    }
    if (error.response.data?.message) {
      return error.response.data.message;
    }
  }
  return "Unable to load the resume. Please try again.";
};

// Supabase signed URLs honour `download=<name>`; a plain `download` attribute
// is ignored for cross-origin links.
const toDownloadUrl = ({ url, fileName }: ResumeUrlResponse) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}download=${encodeURIComponent(fileName ?? "resume")}`;
};

/**
 * Shows one candidate's resume from private storage via a short-lived signed
 * URL from the backend. A fresh URL is requested on load and after expiry.
 */
export default function ResumeViewer({
  applicantId,
}: Readonly<ResumeViewerProps>) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [isExpired, setIsExpired] = useState(false);
  // Bumped to request a fresh signed URL (retry / refresh after expiry).
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCandidateResumeUrl(applicantId)
      .then((resume) => {
        if (!cancelled) setState({ status: "ready", resume });
      })
      .catch((error: unknown) => {
        console.error("Failed to load candidate resume:", error);
        if (!cancelled) {
          setState({ status: "error", message: getResumeErrorMessage(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applicantId, requestKey]);

  const loadResume = useCallback(() => {
    setState({ status: "loading" });
    setIsExpired(false);
    setRequestKey((key) => key + 1);
  }, []);

  // The preview stays rendered after expiry, but Open/Download would fail.
  const expiresAt = state.status === "ready" ? state.resume.expiresAt : null;
  useEffect(() => {
    if (!expiresAt) return;
    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => setIsExpired(true), Math.max(msUntilExpiry, 0));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const backButton = (
    <LinkButton href="/hr/candidates" variant="outlined" sx={outlinedButtonSx}>
      Back to Candidates Profile
    </LinkButton>
  );

  const retryButton = (
    <Button
      variant="outlined"
      startIcon={<Refresh />}
      onClick={loadResume}
      sx={outlinedButtonSx}
    >
      {isExpired ? "Refresh Link" : "Try Again"}
    </Button>
  );

  const actionsSx = {
    mt: 2,
    display: "grid",
    gap: 1.2,
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(auto-fit, minmax(210px, 1fr))",
    },
  };

  if (state.status === "loading") {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (state.status === "error") {
    return (
      <>
        <Alert severity="error" sx={{ mt: 2.2 }}>
          {state.message}
        </Alert>
        <Box sx={actionsSx}>
          {retryButton}
          {backButton}
        </Box>
      </>
    );
  }

  const { resume } = state;
  const isPdf = resume.contentType === "application/pdf";

  return (
    <>
      {isExpired && (
        <Alert severity="warning" sx={{ mt: 2.2 }}>
          The secure resume link has expired. Refresh it to open or download
          the file.
        </Alert>
      )}

      {isPdf ? (
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
            src={resume.url}
            sx={{
              width: "100%",
              height: { xs: 460, sm: 560, md: 760 },
              border: 0,
              backgroundColor: "#ffffff",
            }}
          />
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2.2 }}>
          A preview isn&apos;t available for this file type
          {resume.fileName ? ` (${resume.fileName})` : ""}. Download it to view.
        </Alert>
      )}

      {isPdf && (
        <Typography variant="body2" sx={{ mt: 1, color: "#52718c" }}>
          If the preview doesn&apos;t load, open the resume in a new tab.
        </Typography>
      )}

      <Box sx={actionsSx}>
        {isExpired ? (
          retryButton
        ) : (
          <>
            {isPdf && (
              <Button
                href={resume.url}
                target="_blank"
                rel="noreferrer"
                variant="contained"
                sx={{ textTransform: "none", bgcolor: "#1f80b6", width: "100%" }}
              >
                Open Resume
              </Button>
            )}
            <Button
              href={toDownloadUrl(resume)}
              rel="noreferrer"
              variant="outlined"
              sx={outlinedButtonSx}
            >
              Download Resume
            </Button>
          </>
        )}
        {backButton}
      </Box>
    </>
  );
}
