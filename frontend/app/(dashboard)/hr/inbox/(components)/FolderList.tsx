import {
  Badge,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import {
  FOLDERS,
  INBOX_COLORS,
  LABELS,
  LABEL_IDS,
} from "../(constants)/inbox.constants";
import type { FolderId, InboxThread, LabelId } from "../(types)/inbox.types";
import { getFolderCount } from "../(utils)/inbox.utils";

type FolderListProps = {
  threads: InboxThread[];
  activeFolder: FolderId;
  activeLabel: LabelId | null;
  onSelectFolder: (folder: FolderId) => void;
  onSelectLabel: (label: LabelId) => void;
  onCompose: () => void;
  /** "rail" is the icon-only tablet layout. */
  variant?: "full" | "rail";
};

const itemSx = {
  borderRadius: 2.5,
  mb: 0.3,
  py: 0.7,
  color: INBOX_COLORS.text,
  "& .MuiListItemIcon-root": { minWidth: 34, color: INBOX_COLORS.muted },
  "&.Mui-selected": {
    bgcolor: INBOX_COLORS.selected,
    color: INBOX_COLORS.primary,
    "& .MuiListItemIcon-root": { color: INBOX_COLORS.primary },
    "& .MuiListItemText-primary": { fontWeight: 700 },
  },
  "&.Mui-selected:hover": { bgcolor: "#dcedf9" },
  "&:hover": { bgcolor: INBOX_COLORS.hover },
} as const;

export default function FolderList({
  threads,
  activeFolder,
  activeLabel,
  onSelectFolder,
  onSelectLabel,
  onCompose,
  variant = "full",
}: Readonly<FolderListProps>) {
  if (variant === "rail") {
    return (
      <Stack
        component="nav"
        aria-label="Mail folders"
        spacing={0.6}
        sx={{ alignItems: "center", py: 1.5, height: "100%", overflowY: "auto" }}
      >
        <Tooltip title="Compose" placement="right">
          <IconButton
            aria-label="Compose new message"
            onClick={onCompose}
            sx={{
              mb: 1,
              width: 44,
              height: 44,
              borderRadius: 3,
              bgcolor: INBOX_COLORS.primary,
              color: "#ffffff",
              boxShadow: "0 6px 14px rgba(31, 128, 182, 0.3)",
              "&:hover": { bgcolor: "#196c9a" },
            }}
          >
            <Edit />
          </IconButton>
        </Tooltip>

        {FOLDERS.map(({ id, label, icon: Icon }) => {
          const count = getFolderCount(threads, id);
          const selected = !activeLabel && activeFolder === id;
          return (
            <Tooltip key={id} title={`${label} (${count})`} placement="right">
              <IconButton
                aria-label={`${label}, ${count}`}
                aria-current={selected ? "page" : undefined}
                onClick={() => onSelectFolder(id)}
                sx={{
                  borderRadius: 2.5,
                  color: selected ? INBOX_COLORS.primary : INBOX_COLORS.muted,
                  bgcolor: selected ? INBOX_COLORS.selected : "transparent",
                  "&:hover": { bgcolor: selected ? "#dcedf9" : INBOX_COLORS.hover },
                }}
              >
                <Badge
                  badgeContent={id === "inbox" ? count : 0}
                  color="primary"
                  max={99}
                  sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 16, minWidth: 16 } }}
                >
                  <Icon />
                </Badge>
              </IconButton>
            </Tooltip>
          );
        })}

        <Box sx={{ width: 28, borderTop: `1px solid ${INBOX_COLORS.divider}`, my: 1 }} />

        {LABEL_IDS.map((id) => (
          <Tooltip key={id} title={LABELS[id].label} placement="right">
            <IconButton
              aria-label={`Label: ${LABELS[id].label}`}
              aria-current={activeLabel === id ? "page" : undefined}
              onClick={() => onSelectLabel(id)}
              size="small"
              sx={{
                bgcolor: activeLabel === id ? INBOX_COLORS.selected : "transparent",
              }}
            >
              <LabelDot color={LABELS[id].color} />
            </IconButton>
          </Tooltip>
        ))}
      </Stack>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Mail folders"
      sx={{ p: 1.5, height: "100%", overflowY: "auto" }}
    >
      <Button
        fullWidth
        variant="contained"
        startIcon={<Edit />}
        onClick={onCompose}
        sx={{
          mb: 2,
          py: 1.1,
          borderRadius: 3,
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.95rem",
          bgcolor: INBOX_COLORS.primary,
          boxShadow: "0 6px 14px rgba(31, 128, 182, 0.28)",
          "&:hover": { bgcolor: "#196c9a" },
        }}
      >
        Compose
      </Button>

      <List disablePadding>
        {FOLDERS.map(({ id, label, icon: Icon }) => {
          const count = getFolderCount(threads, id);
          const selected = !activeLabel && activeFolder === id;
          return (
            <ListItemButton
              key={id}
              selected={selected}
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelectFolder(id)}
              sx={itemSx}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{ primary: { sx: { fontSize: "0.9rem" } } }}
              />
              {count > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: id === "inbox" ? 700 : 500,
                    color: id === "inbox" ? INBOX_COLORS.primary : INBOX_COLORS.muted,
                  }}
                >
                  {count}
                  {id === "inbox" && <Box component="span" sx={visuallyHidden}> unread</Box>}
                </Typography>
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Typography
        variant="overline"
        component="h3"
        sx={{
          display: "block",
          px: 1.5,
          mt: 2,
          mb: 0.5,
          color: INBOX_COLORS.muted,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        Labels
      </Typography>
      <List disablePadding>
        {LABEL_IDS.map((id) => (
          <ListItemButton
            key={id}
            selected={activeLabel === id}
            aria-current={activeLabel === id ? "page" : undefined}
            onClick={() => onSelectLabel(id)}
            sx={itemSx}
          >
            <ListItemIcon>
              <LabelDot color={LABELS[id].color} />
            </ListItemIcon>
            <ListItemText
              primary={LABELS[id].label}
              slotProps={{ primary: { sx: { fontSize: "0.9rem" } } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

export function LabelDot({ color, size = 10 }: Readonly<{ color: string; size?: number }>) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: color,
        boxShadow: `0 0 0 3px ${color}26`,
        mx: "auto",
      }}
    />
  );
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;
