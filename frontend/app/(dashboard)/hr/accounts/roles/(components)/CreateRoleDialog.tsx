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
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { Role } from "../../(types)/account.types";
import { createRole } from "@/lib/api/roles";

const ROLE_NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 250;

type CreateRoleDialogProps = {
  open: boolean;
  existingRoles: Role[];
  onClose: () => void;
  onCreated: (role: Role) => void;
};

export default function CreateRoleDialog({
  open,
  existingRoles,
  onClose,
  onCreated,
}: Readonly<CreateRoleDialogProps>) {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const trimmedName = roleName.trim();
  const isDuplicate = existingRoles.some(
    (role) => role.roleName.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  let nameError = "";
  if (!trimmedName) {
    nameError = "Role name is required.";
  } else if (isDuplicate) {
    nameError = "A role with this name already exists.";
  }
  const showNameError = nameTouched && !!nameError;

  const resetForm = () => {
    setRoleName("");
    setDescription("");
    setNameTouched(false);
    setSubmitError("");
  };

  const handleClose = () => {
    if (isCreating) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setNameTouched(true);
    if (nameError || isCreating) return;

    setSubmitError("");
    setIsCreating(true);
    try {
      const role = await createRole(
        { roleName: trimmedName, description: description.trim() || undefined },
        existingRoles,
      );
      resetForm();
      onCreated(role);
    } catch (error) {
      console.error("Failed to create role:", error);
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to create the role. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle
          sx={{
            pb: 1.1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Stack>
            <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
              Create New Role
            </Typography>
            <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
              The role starts with no permissions. You can assign them after
              it&apos;s created.
            </Typography>
          </Stack>
          <IconButton
            aria-label="Close create role form"
            onClick={handleClose}
            disabled={isCreating}
            size="small"
            sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: "16px !important" }}>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              size="small"
              label="Role Name"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              onBlur={() => setNameTouched(true)}
              error={showNameError}
              helperText={showNameError ? nameError : "e.g. Talent Sourcer"}
              required
              autoFocus
              disabled={isCreating}
              fullWidth
              slotProps={{ htmlInput: { maxLength: ROLE_NAME_MAX_LENGTH } }}
            />
            <TextField
              size="small"
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              helperText={`${description.length}/${DESCRIPTION_MAX_LENGTH}`}
              multiline
              minRows={3}
              disabled={isCreating}
              fullWidth
              slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH } }}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 1.6 }}>
          <Button
            variant="text"
            onClick={handleClose}
            disabled={isCreating}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isCreating || (nameTouched && !!nameError)}
            startIcon={
              isCreating ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
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
            {isCreating ? "Creating..." : "Create Role"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
