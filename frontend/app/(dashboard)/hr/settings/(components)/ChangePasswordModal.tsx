"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordModal({
  open,
  onClose,
}: Readonly<ChangePasswordModalProps>) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const resetState = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setIsSuccess(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setError("");
    setIsSuccess(true);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{
          pb: 1.1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
            Change Password
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
            Choose a strong password you don&apos;t use elsewhere.
          </Typography>
        </Box>
        <IconButton
          aria-label="Close change password dialog"
          onClick={handleClose}
          size="small"
          sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: "16px !important" }}>
        {isSuccess ? (
          <Alert severity="success">
            Password updated locally. This is a UI-only demo — no request was
            sent.
          </Alert>
        ) : (
          <Stack spacing={1.6}>
            <TextField
              size="small"
              type="password"
              label="Current Password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
            />
            <TextField
              size="small"
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              fullWidth
            />
            <TextField
              size="small"
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 1.6 }}>
        {isSuccess ? (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 700,
              background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
              "&:hover": {
                background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
              },
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button
              variant="text"
              onClick={handleClose}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 700,
                background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                },
              }}
            >
              Update Password
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
