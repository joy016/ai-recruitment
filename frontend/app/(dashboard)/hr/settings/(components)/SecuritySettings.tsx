"use client";

import { useState } from "react";
import { Alert, Button, Chip, Divider, Snackbar, Stack } from "@mui/material";
import SettingsSection from "./SettingsSection";
import SettingRow from "./SettingRow";
import ChangePasswordModal from "./ChangePasswordModal";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import { formatLastLogin } from "../(constants)/constants";

type SecuritySettingsProps = {
  lastLoginAt: string;
};

const outlinedButtonSx = { textTransform: "none", borderRadius: 2 } as const;

const primaryButtonSx = {
  textTransform: "none",
  borderRadius: 2,
  fontWeight: 700,
  background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
  "&:hover": {
    background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
  },
} as const;

export default function SecuritySettings({
  lastLoginAt,
}: Readonly<SecuritySettingsProps>) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isLogoutAllConfirmOpen, setIsLogoutAllConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastOpen, setIsToastOpen] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastOpen(true);
  };

  const handleToggleTwoFactor = () => {
    setIsTwoFactorEnabled((current) => {
      const next = !current;
      showToast(
        next
          ? "Two-factor authentication enabled."
          : "Two-factor authentication disabled.",
      );
      return next;
    });
  };

  return (
    <Stack spacing={2.5}>
      <SettingsSection
        title="Password"
        description="Manage the password used to sign in."
      >
        <SettingRow
          label="Password"
          description="••••••••••••"
          control={
            <Button
              variant="outlined"
              onClick={() => setIsPasswordModalOpen(true)}
              sx={outlinedButtonSx}
            >
              Change Password
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      >
        <SettingRow
          label="Status"
          description={
            <Chip
              size="small"
              label={isTwoFactorEnabled ? "Enabled" : "Not Enabled"}
              sx={{
                mt: 0.4,
                fontWeight: 600,
                color: isTwoFactorEnabled ? "#1c8758" : "#b36a00",
                bgcolor: isTwoFactorEnabled ? "#e8f7ef" : "#fff3e3",
              }}
            />
          }
          control={
            <Button
              variant={isTwoFactorEnabled ? "outlined" : "contained"}
              onClick={handleToggleTwoFactor}
              sx={isTwoFactorEnabled ? outlinedButtonSx : primaryButtonSx}
            >
              {isTwoFactorEnabled ? "Disable" : "Enable"}
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Active Sessions"
        description="Manage devices currently signed in to your account."
      >
        <Stack divider={<Divider />} spacing={0}>
          <SettingRow
            label="Last Login"
            description={formatLastLogin(lastLoginAt)}
            control={
              <Button
                variant="outlined"
                onClick={() =>
                  showToast("Session list is a UI-only preview for now.")
                }
                sx={outlinedButtonSx}
              >
                View Sessions
              </Button>
            }
          />
          <SettingRow
            label="Sign out everywhere"
            description="This will sign you out of all devices, including this one."
            control={
              <Button
                variant="outlined"
                color="error"
                onClick={() => setIsLogoutAllConfirmOpen(true)}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Log Out of All Sessions
              </Button>
            }
          />
        </Stack>
      </SettingsSection>

      <ChangePasswordModal
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <ConfirmationModal
        open={isLogoutAllConfirmOpen}
        title="Log out of all sessions?"
        description="You'll be signed out on every device where you're currently logged in."
        confirmLabel="Log Out Everywhere"
        confirmTone="danger"
        onConfirm={() => showToast("Signed out of all sessions. (UI-only demo.)")}
        onClose={() => setIsLogoutAllConfirmOpen(false)}
      />

      <Snackbar
        open={isToastOpen}
        autoHideDuration={3000}
        onClose={() => setIsToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setIsToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
