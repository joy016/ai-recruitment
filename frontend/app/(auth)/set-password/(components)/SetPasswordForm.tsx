"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import { LockOutlined, Visibility, VisibilityOff } from "@mui/icons-material";
import PasswordRequirements from "./PasswordRequirements";
import {
  PASSWORD_MAX_LENGTH,
  meetsPasswordRequirements,
} from "@/lib/utils/password";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    backgroundColor: "#f7fbfe",
    "& fieldset": { borderColor: "#d7e8f5" },
    "&:hover fieldset": { borderColor: "#9cc9e6" },
    "&.Mui-focused fieldset": { borderColor: "#2f90c5" },
  },
} as const;

type SetPasswordFormProps = {
  isSubmitting: boolean;
  submitError?: string;
  onSubmit: (password: string, confirmPassword: string) => void;
};

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
  error?: boolean;
  helperText?: string;
  autoFocus?: boolean;
};

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  error,
  helperText,
  autoFocus,
}: Readonly<PasswordFieldProps>) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      fullWidth
      label={label}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      disabled={disabled}
      error={error}
      helperText={helperText}
      sx={fieldSx}
      slotProps={{
        htmlInput: { maxLength: PASSWORD_MAX_LENGTH },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <LockOutlined sx={{ color: "#7d9ab0" }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setVisible((current) => !current)}
                edge="end"
                aria-label={visible ? `Hide ${label}` : `Show ${label}`}
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export default function SetPasswordForm({
  isSubmitting,
  submitError,
  onSubmit,
}: Readonly<SetPasswordFormProps>) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordValid = meetsPasswordRequirements(password);
  const passwordsMatch = confirmPassword === password;
  // Only flag a mismatch once the user has started confirming.
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const canSubmit =
    passwordValid && confirmPassword.length > 0 && passwordsMatch;

  const handleSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;
    onSubmit(password, confirmPassword);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {submitError}
        </Alert>
      )}

      <PasswordField
        label="New Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        disabled={isSubmitting}
        autoFocus
      />

      <Box sx={{ mt: 1.5, mb: 2.5 }}>
        <PasswordRequirements password={password} />
      </Box>

      <PasswordField
        label="Confirm Password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        disabled={isSubmitting}
        error={showMismatch}
        helperText={
          showMismatch
            ? "Passwords do not match."
            : confirmPassword && passwordsMatch
              ? "Passwords match."
              : undefined
        }
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={!canSubmit || isSubmitting}
        startIcon={
          isSubmitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : undefined
        }
        sx={{
          mt: 3.5,
          borderRadius: 2.5,
          py: 1.4,
          fontWeight: 700,
          fontSize: "1rem",
          textTransform: "none",
          background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
          boxShadow: "0 6px 18px rgba(47, 144, 197, 0.25)",
          "&:hover": {
            background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
          },
          "&.Mui-disabled": {
            background: "#d9e6ef",
            color: "#8aa3b6",
            boxShadow: "none",
          },
        }}
      >
        {isSubmitting ? "Activating..." : "Activate Account"}
      </Button>
    </Box>
  );
}
