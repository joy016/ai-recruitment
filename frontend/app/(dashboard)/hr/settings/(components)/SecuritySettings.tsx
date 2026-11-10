"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Divider, Snackbar, Stack } from "@mui/material";
import SettingsSection from "./SettingsSection";
import SettingRow from "./SettingRow";
import ChangePasswordModal from "./ChangePasswordModal";
import ActiveSessionsModal from "./ActiveSessionsModal";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import { formatLastLogin } from "../(constants)/constants";
import { getSecuritySummary, logoutAllSessions } from "@/lib/api/security";
import { clearToken } from "@/lib/utils/token";
import { useAppDispatch } from "@/lib/store/hooks";
import { clearUser } from "@/lib/store/features/userSlice";
import { LOGGED_OUT_EVERYWHERE_REASON } from "@/app/component/SessionGuard";
import { formatRelativeTime } from "@/lib/utils/date";

const outlinedButtonSx = { textTransform: "none", borderRadius: 2 } as const;

export default function SecuritySettings() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isLogoutAllConfirmOpen, setIsLogoutAllConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastOpen, setIsToastOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSecuritySummary()
      .then((summary) => {
        if (cancelled) return;
        setLastLoginAt(summary.lastLoginAt);
        setPasswordChangedAt(summary.passwordChangedAt);
      })
      .catch((error) => {
        console.error("Failed to load security summary:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastOpen(true);
  };

  // Shared by "Log Out of All Sessions" and revoking the session you're currently using
  // from the Active Sessions list - both end this session the same way.
  const endSessionAndRedirectToLogin = () => {
    clearToken();
    dispatch(clearUser());
    queryClient.clear();
    router.push(`/login?reason=${LOGGED_OUT_EVERYWHERE_REASON}`);
  };

  const handlePasswordChanged = () => {
    setPasswordChangedAt(new Date().toISOString());
    showToast("Password updated. Other devices were signed out.");
  };

  return (
    <Stack spacing={2.5}>
      <SettingsSection
        title="Password"
        description="Manage the password used to sign in."
      >
        <SettingRow
          label="Password"
          description={
            passwordChangedAt
              ? `••••••••••••  ·  Last changed ${formatRelativeTime(passwordChangedAt)}`
              : "••••••••••••"
          }
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
        title="Active Sessions"
        description="Manage devices currently signed in to your account."
      >
        <Stack divider={<Divider />} spacing={0}>
          <SettingRow
            label="Last Login"
            description={
              lastLoginAt
                ? formatLastLogin(lastLoginAt)
                : "No previous login recorded"
            }
            control={
              <Button
                variant="outlined"
                onClick={() => setIsSessionsModalOpen(true)}
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
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          handlePasswordChanged();
        }}
      />

      <ActiveSessionsModal
        open={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        onCurrentSessionRevoked={endSessionAndRedirectToLogin}
      />

      <ConfirmationModal
        open={isLogoutAllConfirmOpen}
        title="Log out of all sessions?"
        description="You'll be signed out on every device where you're currently logged in, including this one."
        confirmLabel="Log Out Everywhere"
        confirmTone="danger"
        onConfirm={async () => {
          await logoutAllSessions();
          endSessionAndRedirectToLogin();
        }}
        onClose={() => setIsLogoutAllConfirmOpen(false)}
      />

      <Snackbar
        open={isToastOpen}
        autoHideDuration={4200}
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
