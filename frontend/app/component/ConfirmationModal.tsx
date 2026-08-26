"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "default",
  onConfirm,
  onClose,
}: Readonly<ConfirmationModalProps>) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirm = async () => {
    setErrorMessage("");
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Confirmation action failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (isConfirming) {
      return;
    }
    setErrorMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: "#17456a" }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {description && (
          <Typography variant="body2" sx={{ color: "#52718c" }}>
            {description}
          </Typography>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {errorMessage}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="text"
          onClick={handleClose}
          disabled={isConfirming}
          sx={{ textTransform: "none" }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isConfirming}
          startIcon={
            isConfirming ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
          sx={
            confirmTone === "danger"
              ? {
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 700,
                  bgcolor: "#d64545",
                  "&:hover": { bgcolor: "#b93a3a" },
                }
              : {
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 700,
                  background:
                    "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                  },
                }
          }
        >
          {isConfirming ? "Please wait..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
