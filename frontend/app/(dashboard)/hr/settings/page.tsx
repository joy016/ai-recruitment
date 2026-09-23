"use client";

import { useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import SettingsNavigation from "./(components)/SettingsNavigation";
import ProfileSettings from "./(components)/ProfileSettings";
import SecuritySettings from "./(components)/SecuritySettings";
import NotificationSettings from "./(components)/NotificationSettings";
import PreferenceSettings from "./(components)/PreferenceSettings";
import PermissionSettings from "./(components)/PermissionSettings";
import { MOCK_LAST_LOGIN, MOCK_USER_PROFILE } from "./(constants)/constants";
import { SettingsSectionKey, UserProfile } from "./(types)/settings.types";

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionKey>("profile");
  const [profile, setProfile] = useState<UserProfile>(MOCK_USER_PROFILE);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSettings profile={profile} onSave={setProfile} />;
      case "security":
        return <SecuritySettings lastLoginAt={MOCK_LAST_LOGIN} />;
      case "notifications":
        return <NotificationSettings />;
      case "preferences":
        return <PreferenceSettings />;
      case "permissions":
        return <PermissionSettings />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2.2, md: 3 },
          borderRadius: 3,
          border: "1px solid #d7e8f5",
          backgroundColor: "#ffffff",
          mb: 2.5,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: "#17456a",
            fontSize: { xs: "1.2rem", sm: "1.5rem" },
          }}
        >
          Settings
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
          Configure your account, security, notifications, and preferences.
        </Typography>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", md: "240px 1fr" },
          alignItems: "start",
        }}
      >
        <SettingsNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <Box sx={{ minWidth: 0 }}>{renderActiveSection()}</Box>
      </Box>
    </Box>
  );
}
