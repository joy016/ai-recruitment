import { Box, Stack, Typography } from "@mui/material";
import { INBOX_COLORS } from "../(constants)/inbox.constants";

type Illustration = "emptyInbox" | "noSelection" | "noResults";

type InboxEmptyStateProps = {
  illustration: Illustration;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

const STROKE = "#9cc7df";
const FILL = "#eaf5fc";
const ACCENT = "#3bb8a4";

function EmptyInboxArt() {
  return (
    <svg viewBox="0 0 120 96" width="120" height="96">
      <ellipse cx="60" cy="86" rx="44" ry="6" fill={FILL} />
      <path d="M18 44 L34 18 H86 L102 44 V76 a6 6 0 0 1 -6 6 H24 a6 6 0 0 1 -6 -6 Z" fill="#fff" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 44 H42 a18 10 0 0 0 36 0 H102" fill="none" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M50 30 l6 6 l12 -12" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NoSelectionArt() {
  return (
    <svg viewBox="0 0 120 96" width="120" height="96">
      <ellipse cx="60" cy="86" rx="44" ry="6" fill={FILL} />
      <rect x="20" y="22" width="80" height="54" rx="8" fill="#fff" stroke={STROKE} strokeWidth="2.5" />
      <path d="M22 26 L60 52 L98 26" fill="none" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="94" cy="22" r="10" fill={ACCENT} />
      <path d="M94 17 v6 M94 26.5 v0.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function NoResultsArt() {
  return (
    <svg viewBox="0 0 120 96" width="120" height="96">
      <ellipse cx="60" cy="86" rx="44" ry="6" fill={FILL} />
      <circle cx="52" cy="44" r="24" fill="#fff" stroke={STROKE} strokeWidth="2.5" />
      <path d="M70 62 L90 80" stroke={STROKE} strokeWidth="5" strokeLinecap="round" />
      <path d="M44 38 l16 12 M60 38 l-16 12" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const ART: Record<Illustration, () => React.ReactElement> = {
  emptyInbox: EmptyInboxArt,
  noSelection: NoSelectionArt,
  noResults: NoResultsArt,
};

export default function InboxEmptyState({
  illustration,
  title,
  description,
  action,
}: Readonly<InboxEmptyStateProps>) {
  const Art = ART[illustration];
  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        height: "100%",
        minHeight: 240,
        px: 3,
        py: 4,
      }}
    >
      <Box aria-hidden="true" sx={{ mb: 0.5 }}>
        <Art />
      </Box>
      <Typography sx={{ fontWeight: 700, color: INBOX_COLORS.heading }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: INBOX_COLORS.muted, maxWidth: 320 }}>
          {description}
        </Typography>
      )}
      {action}
    </Stack>
  );
}
