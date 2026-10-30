import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import {
  Description,
  FileDownloadOutlined,
  Image as ImageIcon,
  InsertDriveFile,
  PictureAsPdf,
} from "@mui/icons-material";
import { INBOX_COLORS } from "../(constants)/inbox.constants";
import type { Attachment } from "../(types)/inbox.types";

const KIND_ICON = {
  pdf: { icon: PictureAsPdf, color: "#e53935", bg: "#fdecec" },
  doc: { icon: Description, color: "#2f7fd0", bg: "#e8f1fb" },
  image: { icon: ImageIcon, color: "#0f766e", bg: "#e6f6f4" },
  other: { icon: InsertDriveFile, color: "#5f7f96", bg: "#eef4f8" },
} as const;

export default function AttachmentCard({
  attachment,
  onDownload,
}: Readonly<{ attachment: Attachment; onDownload: (attachment: Attachment) => void }>) {
  const { icon: Icon, color, bg } = KIND_ICON[attachment.kind];

  return (
    <Stack
      direction="row"
      spacing={1.2}
      sx={{
        alignItems: "center",
        p: 1,
        pr: 0.5,
        width: { xs: "100%", sm: 230 },
        borderRadius: 2,
        border: `1px solid ${INBOX_COLORS.border}`,
        bgcolor: "#ffffff",
        transition: "box-shadow 120ms, border-color 120ms",
        "&:hover": {
          borderColor: "#9cc7df",
          boxShadow: "0 4px 12px rgba(23, 69, 106, 0.08)",
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 38,
          height: 38,
          borderRadius: 1.5,
          bgcolor: bg,
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: "0.85rem", fontWeight: 600, color: INBOX_COLORS.text }}>
          {attachment.fileName}
        </Typography>
        <Typography variant="caption" sx={{ color: INBOX_COLORS.muted }}>
          {attachment.size}
        </Typography>
      </Box>
      <Tooltip title="Download">
        <IconButton
          size="small"
          aria-label={`Download ${attachment.fileName}`}
          onClick={() => onDownload(attachment)}
          sx={{ color: INBOX_COLORS.primary }}
        >
          <FileDownloadOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
