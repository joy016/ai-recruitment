"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import CommonTable, { CommonTableColumn } from "@/app/component/CommonTable";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import AccountModalForm from "./(components)/AccountModalForm";
import {
  ACCOUNT_STATUS_FILTERS,
  ACCOUNTS_PAGE_SIZE,
  DEFAULT_ACCOUNT_PASSWORD,
  DUMMY_ACCOUNTS,
} from "./(constants)/constants";
import { Account, AccountFormValues, Role } from "./(types)/account.types";
import { getAllRoles } from "@/lib/api/roles";
import {
  createPageChangeHandler,
  createPageSizeChangeHandler,
} from "@/lib/utils/pagination";
import { getUsers, updateUserStatus } from "@/lib/api/user";
import { UserItem } from "@/lib/types/user";

type AccountStatusFilter = (typeof ACCOUNT_STATUS_FILTERS)[number];

const getStatusChipStyle = (status: UserItem["isActive"]) => {
  if (status) {
    return { color: "#1c8758", backgroundColor: "#e8f7ef" };
  }

  return { color: "#8a8f98", backgroundColor: "#eef1f4" };
};

const createAccountId = () => {
  const randomPart = crypto.getRandomValues(new Uint32Array(1))[0];
  return `ACC-${randomPart.toString(36).toUpperCase()}`;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(DUMMY_ACCOUNTS);
  const [statusFilter, setStatusFilter] =
    useState<AccountStatusFilter>("Active");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [formModalKey, setFormModalKey] = useState(0);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<AccountFormValues | null>(
    null,
  );

  const [pendingDelete, setPendingDelete] = useState<UserItem | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedRole, setSelectedRole] = useState({
    roleId: 0,
    roleName: "All",
  });
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    const getRoles = async () => {
      const roles = await getAllRoles();
      console.log("Raw /api/Roles/getAllRoles response:", roles);
      setRoles(roles ?? []);
    };

    getRoles();
  }, []);

  const fetchUsers = async () => {
    const payload = {
      roleId: selectedRole.roleId !== 0 ? selectedRole.roleId : undefined,
      status: statusFilter === "All" ? undefined : statusFilter === "Active",
      pageNumber: pageNumber,
      pageSize: pageSize,
    };
    const users = await getUsers(payload);
    setUsers(users.data ?? []);
    setRowCount(users.totalCount);
    setPageNumber(users.pageNumber);
    setPageSize(users.pageSize);
  };

  useEffect(() => {
    fetchUsers();
  }, [pageNumber, selectedRole.roleId, statusFilter]);

  const existingEmails = useMemo(
    () =>
      accounts
        .filter((account) => account.id !== editingAccountId)
        .map((account) => account.email),
    [accounts, editingAccountId],
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingAccountId(null);
    setEditingValues(null);
    setFormModalKey((key) => key + 1);
    setFormOpen(true);
  };

  const handleOpenEdit = (account: UserItem) => {
    setEditingAccountId(account.id);
    setEditingValues({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: { roleName: account.roleName, roleId: account.roleId },
    });
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  const handleSubmitForm = (values: AccountFormValues) => {
    const selectedRoleName = values.role.roleName as Account["role"];

    if (editingAccountId) {
      setAccounts((current) =>
        current.map((account) =>
          account.id === editingAccountId
            ? {
                ...account,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                role: selectedRoleName,
              }
            : account,
        ),
      );
      showToast("User account updated successfully.");
    } else {
      const newAccount: Account = {
        id: createAccountId(),
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: selectedRoleName,
        status: "Active",
        createdAt: new Date().toISOString(),
      };
      setAccounts((current) => [newAccount, ...current]);
      setPageNumber(1);
      showToast(
        `User account created. Default password: ${DEFAULT_ACCOUNT_PASSWORD} (reset required on first login).`,
      );
    }

    setFormOpen(false);
    fetchUsers();
  };

  const handleRequestDelete = (account: UserItem) => {
    setPendingDelete(account);
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    await updateUserStatus(pendingDelete.id, !pendingDelete.isActive);

    setAccounts((current) =>
      current.filter((account) => account.id !== pendingDelete.id),
    );
    showToast(
      `${pendingDelete.firstName} ${pendingDelete.lastName} was removed.`,
    );
    fetchUsers();
  };

  const handleStatusFilterChange = (
    event: SelectChangeEvent<AccountStatusFilter>,
  ) => {
    setPageNumber(1);
    setStatusFilter(event.target.value as AccountStatusFilter);
  };

  const handleRoleFilterChange = (event: SelectChangeEvent<number>) => {
    const selectedRoleId = Number(event.target.value);
    setPageNumber(1);

    if (selectedRoleId === 0) {
      setSelectedRole({ roleId: 0, roleName: "All" });
      return;
    }

    const matchedRole = roles.find((role) => role.roleId === selectedRoleId);

    if (matchedRole) {
      setSelectedRole({
        roleId: matchedRole.roleId,
        roleName: matchedRole.roleName,
      });
    }
  };

  const handlePageChange = createPageChangeHandler(setPageNumber);
  const handlePageSizeChange = createPageSizeChangeHandler(
    setPageNumber,
    setPageSize,
  );

  const columns: CommonTableColumn<UserItem>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => `${row.firstName} ${row.lastName}`,
      secondary: (row) => row.email,
    },
    {
      key: "role",
      label: "Role",
      render: (row) => {
        const roleColor = roles.find((role) => role.roleId === row.roleId);
        const style = {
          color: roleColor?.chipColor,
          backgroundColor: roleColor?.backgroundColor,
        };
        return (
          <Chip
            size="small"
            label={row.roleName}
            sx={{ fontWeight: 600, ...style }}
          />
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const style = getStatusChipStyle(row.isActive);
        return (
          <Chip
            size="small"
            label={row.isActive ? "Active" : "Inactive"}
            sx={{ fontWeight: 600, ...style }}
          />
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Stack direction="row" spacing={0.6}>
          <Tooltip title="Edit user">
            <IconButton
              size="small"
              aria-label={`Edit ${row.firstName} ${row.lastName}`}
              onClick={() => handleOpenEdit(row)}
              sx={{ color: "#1f80b6" }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete user">
            <IconButton
              size="small"
              aria-label={`Delete ${row.firstName} ${row.lastName}`}
              onClick={() => handleRequestDelete(row)}
              sx={{ color: "#d64545" }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2.2, md: 3 },
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1.2,
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "#17456a",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Accounts
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
            Manage HR portal user accounts and roles.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleOpenCreate}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 700,
            px: 2,
            background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
            "&:hover": {
              background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
            },
          }}
        >
          + Create User
        </Button>
      </Box>

      <Box
        sx={{
          mt: 2.2,
          display: "grid",
          gap: 1,
          justifyContent: "end",
          gridTemplateColumns: { xs: "1fr", sm: "220px 220px" },
        }}
      >
        <Box>
          <Typography
            variant="body2"
            sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
          >
            Status
          </Typography>
          <Select
            size="small"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            fullWidth
          >
            {ACCOUNT_STATUS_FILTERS.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography
            variant="body2"
            sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
          >
            Role
          </Typography>
          <Select
            size="small"
            value={selectedRole.roleId}
            onChange={handleRoleFilterChange}
            renderValue={() => selectedRole.roleName}
            fullWidth
          >
            <MenuItem value={0}>All</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role.roleId} value={role.roleId}>
                {role.roleName}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <CommonTable
          columns={columns}
          data={users}
          getRowKey={(row) => row.id}
          emptyMessage={"sample"}
          pageSize={pageSize}
          pageNumber={pageNumber}
          totalCount={rowCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </Box>

      <AccountModalForm
        key={formModalKey}
        open={formOpen}
        isEditing={Boolean(editingAccountId)}
        userId={editingAccountId!}
        initialValues={editingValues}
        existingEmails={existingEmails}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        roles={roles}
      />

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        title="Delete user account?"
        description={
          pendingDelete
            ? `This will permanently remove "${pendingDelete.firstName} ${pendingDelete.lastName}" (${pendingDelete.email}).`
            : undefined
        }
        confirmLabel="Delete"
        confirmTone="danger"
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
      />

      <Snackbar
        open={toastOpen}
        autoHideDuration={3200}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
