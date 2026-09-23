"use client";

import { useMemo, useState } from "react";
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
import { Account, AccountFormValues } from "./(types)/account.types";

type AccountStatusFilter = (typeof ACCOUNT_STATUS_FILTERS)[number];

const getRoleChipStyle = (role: Account["role"]) => {
  if (role === "Admin") {
    return { color: "#7b2fb0", backgroundColor: "#f3e8fb" };
  }

  if (role === "HR Manager") {
    return { color: "#1c8758", backgroundColor: "#e8f7ef" };
  }

  if (role === "Recruiter") {
    return { color: "#1f80b6", backgroundColor: "#e8f4fb" };
  }

  return { color: "#b36a00", backgroundColor: "#fff3e3" };
};

const getStatusChipStyle = (status: Account["status"]) => {
  if (status === "Active") {
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

  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const filteredAccounts = useMemo(() => {
    if (statusFilter === "All") {
      return accounts;
    }

    return accounts.filter((account) => account.status === statusFilter);
  }, [accounts, statusFilter]);

  const totalCount = filteredAccounts.length;

  const visibleAccounts = useMemo(() => {
    const startIndex = (pageNumber - 1) * pageSize;
    return filteredAccounts.slice(startIndex, startIndex + pageSize);
  }, [filteredAccounts, pageNumber, pageSize]);

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

  const handleOpenEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingValues({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: account.role,
    });
    setFormModalKey((key) => key + 1);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  const handleSubmitForm = (values: AccountFormValues) => {
    if (editingAccountId) {
      setAccounts((current) =>
        current.map((account) =>
          account.id === editingAccountId ? { ...account, ...values } : account,
        ),
      );
      showToast("User account updated successfully.");
    } else {
      const newAccount: Account = {
        id: createAccountId(),
        ...values,
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
  };

  const handleRequestDelete = (account: Account) => {
    setPendingDelete(account);
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) {
      return;
    }

    setAccounts((current) =>
      current.filter((account) => account.id !== pendingDelete.id),
    );
    showToast(
      `${pendingDelete.firstName} ${pendingDelete.lastName} was removed.`,
    );
  };

  const handleStatusFilterChange = (
    event: SelectChangeEvent<AccountStatusFilter>,
  ) => {
    setPageNumber(1);
    setStatusFilter(event.target.value as AccountStatusFilter);
  };

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageNumber(1);
    setPageSize(newPageSize);
  };

  const columns: CommonTableColumn<Account>[] = [
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
        const style = getRoleChipStyle(row.role);
        return (
          <Chip
            size="small"
            label={row.role}
            sx={{ fontWeight: 600, ...style }}
          />
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const style = getStatusChipStyle(row.status);
        return (
          <Chip
            size="small"
            label={row.status}
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
          gridTemplateColumns: { xs: "1fr", sm: "220px" },
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
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <CommonTable
          columns={columns}
          data={visibleAccounts}
          getRowKey={(row) => row.id}
          emptyMessage={
            statusFilter === "All"
              ? "No user accounts yet."
              : `No ${statusFilter.toLowerCase()} user accounts.`
          }
          pageSize={pageSize}
          pageNumber={pageNumber}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </Box>

      <AccountModalForm
        key={formModalKey}
        open={formOpen}
        isEditing={Boolean(editingAccountId)}
        initialValues={editingValues}
        existingEmails={existingEmails}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
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
