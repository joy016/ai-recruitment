"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close, Visibility, VisibilityOff } from "@mui/icons-material";
import { changePassword, toChangePasswordFieldError } from "@/lib/api/security";
import {
  getPasswordStrength,
  PASSWORD_REQUIREMENTS,
  validatePassword,
} from "@/lib/utils/passwordPolicy";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful update, before the modal closes itself. */
  onSuccess: (otherSessionsSignedOut: number) => void;
};

type FieldKey = "currentPassword" | "newPassword" | "confirmNewPassword";
type FieldErrors = Partial<Record<FieldKey, string>>;

const STRENGTH_LABEL: Record<string, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
};

const STRENGTH_COLOR: Record<string, string> = {
  weak: "#c0392b",
  fair: "#b36a00",
  strong: "#1c8758",
};

const STRENGTH_VALUE: Record<string, number> = {
  weak: 33,
  fair: 66,
  strong: 100,
};

const primaryButtonSx = {
  textTransform: "none",
  borderRadius: 2,
  fontWeight: 700,
  background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
  "&:hover": {
    background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
  },
} as const;

export default function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
}: Readonly<ChangePasswordModalProps>) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setTouched({});
    setServerFieldErrors({});
    setFormError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetState();
    onClose();
  };

  // Mirrors the backend's PasswordPolicy; the backend still re-validates on submit.
  const clientErrors: FieldErrors = {};
  if (!currentPassword) {
    clientErrors.currentPassword = "Current password is required.";
  }
  clientErrors.newPassword = newPassword
    ? validatePassword(newPassword) ?? undefined
    : PASSWORD_REQUIREMENTS;
  if (!clientErrors.newPassword && currentPassword && newPassword === currentPassword) {
    clientErrors.newPassword = "New password must be different from your current password.";
  }
  if (!confirmPassword) {
    clientErrors.confirmNewPassword = "Please confirm your new password.";
  } else if (confirmPassword !== newPassword) {
    clientErrors.confirmNewPassword = "New password and confirmation do not match.";
  }

  const isFormValid = !clientErrors.currentPassword && !clientErrors.newPassword && !clientErrors.confirmNewPassword;
  const strength = newPassword ? getPasswordStrength(newPassword) : null;

  const fieldError = (field: FieldKey): string | undefined =>
    serverFieldErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

  const markTouched = (field: FieldKey) =>
    setTouched((current) => ({ ...current, [field]: true }));

  const clearServerError = (field: FieldKey) =>
    setServerFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ currentPassword: true, newPassword: true, confirmNewPassword: true });

    if (!isFormValid || isSubmitting) return;

    setFormError("");
    setServerFieldErrors({});
    setIsSubmitting(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      resetState();
      onSuccess(result.otherSessionsSignedOut);
    } catch (error) {
      console.error("Failed to change password:", error);
      const { field, message } = toChangePasswordFieldError(error);
      if (field) {
        setServerFieldErrors({ [field]: message });
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const eyeToggle = (
    visible: boolean,
    onToggle: () => void,
    label: string,
  ) => (
    <InputAdornment position="end">
      <IconButton
        onClick={onToggle}
        edge="end"
        size="small"
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      >
        {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle
          id="change-password-title"
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
            disabled={isSubmitting}
            size="small"
            sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: "16px !important" }}>
          <Stack spacing={1.6}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              size="small"
              type={showCurrent ? "text" : "password"}
              label="Current Password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                clearServerError("currentPassword");
              }}
              onBlur={() => markTouched("currentPassword")}
              error={!!fieldError("currentPassword")}
              helperText={fieldError("currentPassword")}
              autoComplete="current-password"
              disabled={isSubmitting}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: eyeToggle(
                    showCurrent,
                    () => setShowCurrent((v) => !v),
                    "current password",
                  ),
                },
              }}
            />
            <Box>
              <TextField
                size="small"
                type={showNew ? "text" : "password"}
                label="New Password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  clearServerError("newPassword");
                }}
                onBlur={() => markTouched("newPassword")}
                error={!!fieldError("newPassword")}
                helperText={fieldError("newPassword") || PASSWORD_REQUIREMENTS}
                autoComplete="new-password"
                disabled={isSubmitting}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: eyeToggle(
                      showNew,
                      () => setShowNew((v) => !v),
                      "new password",
                    ),
                  },
                }}
              />
              {strength && (
                <Box sx={{ mt: 0.6 }}>
                  <LinearProgress
                    variant="determinate"
                    value={STRENGTH_VALUE[strength]}
                    sx={{
                      height: 5,
                      borderRadius: 3,
                      bgcolor: "#e8f0f7",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: STRENGTH_COLOR[strength],
                        borderRadius: 3,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: STRENGTH_COLOR[strength], fontWeight: 600 }}
                  >
                    {STRENGTH_LABEL[strength]}
                  </Typography>
                </Box>
              )}
            </Box>
            <TextField
              size="small"
              type={showConfirm ? "text" : "password"}
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearServerError("confirmNewPassword");
              }}
              onBlur={() => markTouched("confirmNewPassword")}
              error={!!fieldError("confirmNewPassword")}
              helperText={fieldError("confirmNewPassword")}
              autoComplete="new-password"
              disabled={isSubmitting}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: eyeToggle(
                    showConfirm,
                    () => setShowConfirm((v) => !v),
                    "confirm password",
                  ),
                },
              }}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 1.6 }}>
          <Button
            variant="text"
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !isFormValid}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
            sx={primaryButtonSx}
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
