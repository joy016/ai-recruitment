"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Divider,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import SettingsSection from "./SettingsSection";
import ToggleSetting from "./ToggleSetting";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api/notifications";
import { NotificationPreference } from "@/lib/types/notification";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

const getNetworkAwareMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error) && !error.response
    ? "Unable to reach the server. Check your connection and try again."
    : fallback;

/**
 * One toggle per category the API returns, so categories added on the
 * backend appear here automatically.
 */
export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [requestKey, setRequestKey] = useState(0);
  const [savingCategories, setSavingCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationPreferences()
      .then((loaded) => {
        if (cancelled) return;
        setPreferences(loaded);
        setLoadState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadState({
          status: "error",
          message: getNetworkAwareMessage(
            error,
            "Unable to load your notification settings.",
          ),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const handleRetry = () => {
    setLoadState({ status: "loading" });
    setRequestKey((key) => key + 1);
  };

  const setEnabled = (category: string, isEnabled: boolean) =>
    setPreferences((current) =>
      current.map((preference) =>
        preference.category === category ? { ...preference, isEnabled } : preference,
      ),
    );

  const setSaving = (category: string, saving: boolean) =>
    setSavingCategories((current) => {
      const next = new Set(current);
      if (saving) next.add(category);
      else next.delete(category);
      return next;
    });

  const handleToggle = async (category: string, isEnabled: boolean) => {
    setEnabled(category, isEnabled);
    setSaving(category, true);
    try {
      const updated = await updateNotificationPreferences([{ category, isEnabled }]);
      // Trust the server's effective value for this category, if it sent one.
      const saved = updated.find((preference) => preference.category === category);
      if (saved) setEnabled(category, saved.isEnabled);
    } catch (error) {
      setEnabled(category, !isEnabled);
      setToastMessage(
        getNetworkAwareMessage(error, "Couldn't save your notification setting."),
      );
    } finally {
      setSaving(category, false);
    }
  };

  const renderContent = () => {
    if (loadState.status === "loading") {
      return (
        <Stack divider={<Divider />} spacing={0} aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Box key={key} sx={{ py: 1.5 }}>
              <Skeleton variant="text" width="35%" />
              <Skeleton variant="text" width="70%" />
            </Box>
          ))}
        </Stack>
      );
    }

    if (loadState.status === "error") {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={handleRetry}
              sx={{ textTransform: "none" }}
            >
              Try Again
            </Button>
          }
        >
          {loadState.message}
        </Alert>
      );
    }

    return (
      <>
        <Stack divider={<Divider />} spacing={0}>
          {preferences.map((preference) => (
            <ToggleSetting
              key={preference.category}
              title={preference.label}
              description={preference.description}
              checked={preference.isEnabled}
              disabled={savingCategories.has(preference.category)}
              onChange={(checked) => handleToggle(preference.category, checked)}
            />
          ))}
        </Stack>
        <Typography variant="body2" sx={{ mt: 2, color: "#5f7f96" }}>
          Turning a category off stops future notifications only. Existing
          notifications stay visible.
        </Typography>
      </>
    );
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Choose what you want to be notified about."
    >
      {renderContent()}

      <Snackbar
        open={toastMessage !== null}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setToastMessage(null)}
          sx={{ width: "100%" }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </SettingsSection>
  );
}
