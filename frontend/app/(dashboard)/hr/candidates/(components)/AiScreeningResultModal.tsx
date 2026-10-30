"use client";

import { useCallback, useEffect, useId, useState } from "react";
import axios from "axios";
import {
  Alert,
  AlertColor,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { AutoAwesome, Close, Refresh } from "@mui/icons-material";
import { getApplicantScreening } from "@/lib/api/applicant-screening";
import { ApplicantScreeningResponse } from "@/lib/types/screening";
import {
  SCREENING_TONES,
  ScreeningToneName,
  getScreeningStatusConfig,
} from "@/constant/screening";
import { formatNumericDateTime } from "@/lib/utils/date";
import RecommendationBadge from "./ai-screening/RecommendationBadge";
import ScoreIndicator from "./ai-screening/ScoreIndicator";
import SkillChips from "./ai-screening/SkillChips";

type AiScreeningResultModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string | null;
  candidateName: string;
};

type ScreeningState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; screening: ApplicantScreeningResponse };

const TONE_TO_ALERT: Record<ScreeningToneName, AlertColor> = {
  success: "success",
  warning: "warning",
  danger: "error",
  neutral: "info",
};

const cardSx = {
  p: 2,
  borderRadius: 2,
  border: "1px solid #dfedf7",
  bgcolor: "#f7fbff",
} as const;

const sectionTitleSx = { fontWeight: 700, color: "#17456a", mb: 1 } as const;

const getScreeningErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response) {
      return "Unable to reach the server. Please check your connection and try again.";
    }
    if (error.response.status === 403) {
      return "You don't have permission to view this candidate's AI screening result.";
    }
  }
  return "Unable to load the AI screening result. Please try again.";
};

/**
 * Shows the advisory AI (n8n) screening result for one candidate. The result
 * is fetched only while the dialog is open.
 */
export default function AiScreeningResultModal({
  open,
  onClose,
  candidateId,
  candidateName,
}: Readonly<AiScreeningResultModalProps>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      scroll="paper"
      aria-labelledby={titleId}
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 3 } } }}
    >
      <DialogTitle
        component="div"
        sx={{ display: "flex", alignItems: "flex-start", gap: 1.2, pb: 1.5 }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "#e8f1fb",
            color: "#1f80b6",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <AutoAwesome sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            id={titleId}
            component="h2"
            sx={{ fontWeight: 700, fontSize: 18, color: "#17456a" }}
          >
            AI Screening Result
          </Typography>
          <Typography
            variant="body2"
            noWrap
            sx={{ color: "#5f7f96", mt: 0.3 }}
          >
            {candidateName}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close AI screening result"
          onClick={onClose}
          sx={{ color: "#5f7f96", mt: -0.5, mr: -1 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: "16px !important" }}>
        {/* Keyed so switching candidates starts from a clean state. Dialog
            unmounts its children once closed, which resets everything. */}
        {candidateId && (
          <ScreeningBody key={candidateId} candidateId={candidateId} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScreeningBody({ candidateId }: Readonly<{ candidateId: string }>) {
  const [state, setState] = useState<ScreeningState>({ status: "loading" });
  // Bumped by Retry to refetch.
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    getApplicantScreening(candidateId, controller.signal)
      .then((screening) => {
        if (!cancelled) setState({ status: "ready", screening });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setState({ status: "notFound" });
        } else {
          setState({ status: "error", message: getScreeningErrorMessage(error) });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [candidateId, requestKey]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setRequestKey((key) => key + 1);
  }, []);

  if (state.status === "loading") {
    return <ScreeningSkeleton />;
  }

  if (state.status === "error") {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<Refresh />}
            onClick={retry}
            sx={{ textTransform: "none" }}
          >
            Retry
          </Button>
        }
      >
        {state.message}
      </Alert>
    );
  }

  if (state.status === "notFound") {
    return (
      <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", py: 4 }}>
        <AutoAwesome aria-hidden="true" sx={{ fontSize: 36, color: "#9bb7c9" }} />
        <Typography sx={{ fontWeight: 600, color: "#17456a" }}>
          No AI screening result yet for this candidate.
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f7f96" }}>
          Results appear here once the AI finishes reviewing the application.
        </Typography>
      </Stack>
    );
  }

  return <ScreeningDetails screening={state.screening} />;
}

function ScreeningDetails({
  screening,
}: Readonly<{ screening: ApplicantScreeningResponse }>) {
  const statusConfig = getScreeningStatusConfig(screening.screeningStatus);
  const statusTone = SCREENING_TONES[statusConfig.tone];
  const matchedSkills = screening.matchedSkills ?? [];
  const missingSkills = screening.missingSkills ?? [];

  return (
    <Stack spacing={2.2}>
      {statusConfig.message && (
        <Alert severity={TONE_TO_ALERT[statusConfig.tone]}>
          {statusConfig.message}
        </Alert>
      )}

      {statusConfig.showResult && (
        <Box
          sx={{
            ...cardSx,
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            flexWrap: "wrap",
          }}
        >
          <Stack spacing={0.8} sx={{ alignItems: "center" }}>
            <ScoreIndicator score={screening.qualificationScore} />
            <Typography variant="caption" sx={{ color: "#5f7f96" }}>
              Qualification Score
            </Typography>
          </Stack>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ color: "#5f7f96", mb: 0.6 }}>
              Recommendation
            </Typography>
            <RecommendationBadge recommendation={screening.recommendation} />
          </Box>
        </Box>
      )}

      {screening.summary && (
        <Box component="section">
          <Typography sx={sectionTitleSx}>Summary</Typography>
          <Box sx={cardSx}>
            <Typography
              variant="body2"
              sx={{ color: "#264a66", lineHeight: 1.6, whiteSpace: "pre-line" }}
            >
              {screening.summary}
            </Typography>
          </Box>
        </Box>
      )}

      {statusConfig.showResult && (
        <>
          <SkillChips
            title="Matched Skills"
            skills={matchedSkills}
            tone="success"
            emptyText="No matched skills"
          />
          <SkillChips
            title="Missing Skills"
            skills={missingSkills}
            tone="danger"
            emptyText="No missing skills"
          />
        </>
      )}

      <Divider />

      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 2,
          rowGap: 1,
          color: "#5f7f96",
        }}
      >
        <Chip
          label={statusConfig.label}
          size="small"
          sx={{
            bgcolor: statusTone.bg,
            color: statusTone.color,
            fontWeight: 600,
          }}
        />
        {screening.screenedAt && (
          <Typography variant="caption">
            Screened on {formatNumericDateTime(screening.screenedAt)}
          </Typography>
        )}
        {screening.updatedAt && (
          <Typography variant="caption">
            Updated {formatNumericDateTime(screening.updatedAt)}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

function ScreeningSkeleton() {
  return (
    <Stack spacing={2.2} aria-busy="true" aria-label="Loading AI screening result">
      <Box sx={{ ...cardSx, display: "flex", alignItems: "center", gap: 2.5 }}>
        <Skeleton variant="circular" width={88} height={88} />
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Skeleton width="40%" />
          <Skeleton variant="rounded" width={90} height={24} />
        </Stack>
      </Box>
      <Skeleton variant="rounded" height={72} />
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.8 }}>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} variant="rounded" width={72} height={24} />
        ))}
      </Stack>
    </Stack>
  );
}
