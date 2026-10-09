"use client";

import { useEffect, useState } from "react";
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
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import {
  EMPTY_ACCOUNT_FORM,
  generateUniqueAccountEmail,
} from "../(constants)/constants";
import { AccountFormValues, Role } from "../(types)/account.types";
import { editUser, getUser, insertUser } from "@/lib/api/user";
import { capitalizeFirstLetter } from "@/utils/capitalize-letter";
import { DEFAULT_PASSWORD } from "@/constant/default-pass";
import { useAppSelector } from "@/lib/store/hooks";
import { Department } from "@/lib/types/department";

type AccountModalFormProps = {
  open: boolean;
  isEditing: boolean;
  initialValues: AccountFormValues | null;
  /** Emails already in use by other accounts, used to keep generated emails unique. */
  existingEmails: string[];
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => void;
  roles: Role[];
  userId: string;
  department: Department[];
};

export default function AccountModalForm({
  open,
  isEditing,
  initialValues,
  existingEmails,
  onClose,
  onSubmit,
  roles,
  userId,
  department,
}: Readonly<AccountModalFormProps>) {
  const [accountForm, setAccountForm] = useState<AccountFormValues>(
    () => initialValues ?? EMPTY_ACCOUNT_FORM,
  );
  const [formError, setFormError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<AccountFormValues | null>(
    null,
  );
  const currentUser = useAppSelector((state) => state.user.currentUser);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      const user = await getUser(userId);
      setAccountForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        role: { roleId: user.roleId, roleName: user.roleName },
        department: {
          id: user.depId,
          departmentName: user.departmentName,
        },
      });
    };

    fetchUser();
  }, [userId]);

  const handleNameChange = (field: "firstName" | "lastName", value: string) => {
    setAccountForm((current) => {
      const next = { ...current, [field]: value };
      return {
        ...next,
        email: generateUniqueAccountEmail(
          next.firstName,
          next.lastName,
          existingEmails,
        ),
      };
    });
  };

  const handleRequestSubmit = async () => {
    if (!accountForm.firstName.trim() || !accountForm.lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }

    if (!accountForm.email) {
      setFormError("Unable to generate email. Please check the name fields.");
      return;
    }

    if (!accountForm.role.roleId) {
      setFormError("Please select a role.");
      return;
    }

    if (!accountForm.department.id) {
      setFormError("Please select a department.");
      return;
    }

    const finalValues: AccountFormValues = {
      ...accountForm,
      firstName: accountForm.firstName.trim(),
      lastName: accountForm.lastName.trim(),
    };

    setFormError("");
    setPendingValues(finalValues);
    setConfirmOpen(true);
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    setPendingValues(null);
  };

  const handleConfirmSave = async () => {
    if (!pendingValues) {
      return;
    }

    if (isEditing) {
      await editUser(userId, {
        firstName: capitalizeFirstLetter(accountForm.firstName),
        lastName: capitalizeFirstLetter(accountForm.lastName),
        email: accountForm.email,
        roleId: accountForm.role.roleId,
        depId: accountForm.department.id,
      });
    } else {
      const userPayload = {
        firstName: capitalizeFirstLetter(accountForm.firstName),
        lastName: capitalizeFirstLetter(accountForm.lastName),
        email: accountForm.email,
        password: DEFAULT_PASSWORD,
        insertedBy: currentUser?.firstName! + currentUser?.lastName!,
        roleId: accountForm.role.roleId,
        departmentId: accountForm.department.id,
      };

      await insertUser(userPayload);
    }

    onSubmit(pendingValues);
    setPendingValues(null);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
            {isEditing ? "Edit User" : "Create User"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
            {isEditing
              ? "Update this user's account details."
              : "Fill in the details to create a new user account."}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close user form"
          onClick={onClose}
          size="small"
          sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: "16px !important" }}>
        <Stack spacing={1.4}>
          <Box
            sx={{
              display: "grid",
              gap: 1.3,
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            <TextField
              size="small"
              label="First Name"
              value={accountForm.firstName}
              onChange={(event) =>
                handleNameChange("firstName", event.target.value)
              }
              required
              fullWidth
            />
            <TextField
              size="small"
              label="Last Name"
              value={accountForm.lastName}
              onChange={(event) =>
                handleNameChange("lastName", event.target.value)
              }
              required
              fullWidth
            />
          </Box>

          <TextField
            size="small"
            label="Email"
            value={accountForm.email}
            placeholder="Auto-generated from first and last name"
            helperText="Auto-generated as lastname.firstname@company.com.ph (a number is appended if that email is already taken)"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />

          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Role
            </Typography>
            <Select
              size="small"
              value={accountForm.role.roleId || ""}
              onChange={(event) => {
                const selectedRoleId = Number(event.target.value);
                const selectedRole = roles.find(
                  (role) => role.roleId === selectedRoleId,
                );
                if (!selectedRole) {
                  return;
                }

                setAccountForm((current) => ({
                  ...current,
                  role: {
                    roleId: selectedRole.roleId,
                    roleName: selectedRole.roleName,
                  },
                }));
              }}
              fullWidth
            >
              {roles.map((role) => (
                <MenuItem key={role.roleId} value={role.roleId}>
                  {role.roleName}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Department
            </Typography>
            <Select
              size="small"
              value={accountForm.department.id || ""}
              onChange={(event) => {
                const selectedDepartmentId = Number(event.target.value);
                const selectedDepartment = department.find(
                  (d) => d.id === selectedDepartmentId,
                );
                if (!selectedDepartment) {
                  return;
                }

                setAccountForm((current) => ({
                  ...current,
                  department: {
                    id: selectedDepartment.id,
                    departmentName: selectedDepartment.departmentName,
                  },
                }));
              }}
              fullWidth
            >
              {department.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.departmentName}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {!isEditing && (
            <Alert severity="info">
              A default password will be set for this account. The user will be
              required to reset it on first login.
            </Alert>
          )}

          {formError && <Alert severity="error">{formError}</Alert>}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 1.6 }}>
        <Button variant="text" onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleRequestSubmit}
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
          {isEditing ? "Save Changes" : "Create User"}
        </Button>
      </DialogActions>

      <ConfirmationModal
        open={confirmOpen}
        title={isEditing ? "Save changes?" : "Create user?"}
        description={
          isEditing
            ? `Save changes to "${pendingValues?.firstName} ${pendingValues?.lastName}"?`
            : `Create a new user account for "${pendingValues?.firstName} ${pendingValues?.lastName}"?`
        }
        confirmLabel={isEditing ? "Save Changes" : "Create User"}
        onConfirm={handleConfirmSave}
        onClose={handleCancelConfirm}
      />
    </Dialog>
  );
}
