"use client";

import { useMemo, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ImageNotSupportedOutlined } from "@mui/icons-material";
import { sanitizeEmailHtml } from "@/lib/utils/emailHtml";
import { INBOX_COLORS } from "../(constants)/inbox.constants";

/**
 * Renders an email body. The HTML is always re-sanitized with DOMPurify here
 * (never trusted as-is from the API), and remote images stay blocked until
 * HR chooses to show them.
 */
export default function EmailBody({ html }: Readonly<{ html: string }>) {
  const [showImages, setShowImages] = useState(false);
  const { html: safeHtml, blockedImages } = useMemo(
    () => sanitizeEmailHtml(html, { allowRemoteImages: showImages }),
    [html, showImages],
  );

  return (
    <>
      {blockedImages > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1.5,
            px: 1.2,
            py: 0.6,
            borderRadius: 2,
            bgcolor: INBOX_COLORS.surface,
            border: `1px solid ${INBOX_COLORS.border}`,
          }}
        >
          <ImageNotSupportedOutlined fontSize="small" sx={{ color: INBOX_COLORS.muted }} aria-hidden="true" />
          <Typography variant="caption" sx={{ flex: 1, color: INBOX_COLORS.muted }}>
            Images blocked to protect your privacy.
          </Typography>
          <Button size="small" onClick={() => setShowImages(true)} sx={{ textTransform: "none", py: 0 }}>
            Show images
          </Button>
        </Stack>
      )}
      <Box
        // Sanitized above with DOMPurify.
        dangerouslySetInnerHTML={{ __html: safeHtml }}
        sx={{
          fontSize: "0.92rem",
          color: INBOX_COLORS.text,
          lineHeight: 1.7,
          overflowWrap: "anywhere",
          "& p": { mt: 0, mb: 1.5 },
          "& img": { maxWidth: "100%", height: "auto" },
          "& a": { color: INBOX_COLORS.primary },
          "& blockquote": {
            m: 0,
            pl: 1.5,
            borderLeft: `3px solid ${INBOX_COLORS.border}`,
            color: INBOX_COLORS.muted,
          },
          "& table": { maxWidth: "100%" },
        }}
      />
    </>
  );
}
