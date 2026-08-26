"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type ApplicationFormModalProps = {
  open: boolean;
  jobTitle: string;
  applicationLink: string;
  fullApplicationLink: string;
  recipientEmail: string;
  onRecipientEmailChange: (value: string) => void;
  onGenerateLink: () => void;
  onCopyLink: () => void;
  onSendEmail: () => void;
  onClose: () => void;
};

export default function ApplicationFormModal({
  open,
  jobTitle,
  applicationLink,
  fullApplicationLink,
  recipientEmail,
  onRecipientEmailChange,
  onGenerateLink,
  onCopyLink,
  onSendEmail,
  onClose,
}: Readonly<ApplicationFormModalProps>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1.1 }}>
        <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
          Application Form
        </Typography>
        <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
          {jobTitle}
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: "16px !important" }}>
        <Stack spacing={1.4}>
          <Typography sx={{ fontWeight: 700, color: "#1d4f72" }}>
            Application Form Link
          </Typography>

          <TextField
            size="small"
            label="Form Link"
            value={fullApplicationLink}
            slotProps={{ input: { readOnly: true } }}
            fullWidth
          />

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              variant="contained"
              onClick={onCopyLink}
              disabled={!applicationLink}
              size="small"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                background:
                  "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                },
              }}
            >
              Copy Link
            </Button>
            <Button
              variant="outlined"
              href={applicationLink || "#"}
              target="_blank"
              rel="noreferrer"
              disabled={!applicationLink}
              size="small"
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Open Form
            </Button>
            <Button
              variant="text"
              onClick={onGenerateLink}
              size="small"
              sx={{ textTransform: "none" }}
            >
              Generate New Link
            </Button>
          </Stack>

          <Divider sx={{ my: 0.5 }} />

          <Typography sx={{ fontWeight: 700, color: "#1d4f72" }}>
            Send directly to applicant
          </Typography>

          <TextField
            size="small"
            label="Applicant Email"
            type="email"
            value={recipientEmail}
            onChange={(event) => onRecipientEmailChange(event.target.value)}
            fullWidth
          />

          <Button
            variant="outlined"
            onClick={onSendEmail}
            disabled={!applicationLink || !recipientEmail.trim()}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              width: "fit-content",
            }}
          >
            Send via Email
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
