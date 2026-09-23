"use client";

import { useState } from "react";
import { Divider, Stack } from "@mui/material";
import SettingsSection from "./SettingsSection";
import ToggleSetting from "./ToggleSetting";
import { MOCK_NOTIFICATION_SETTINGS } from "../(constants)/constants";
import { NotificationSetting } from "../(types)/settings.types";

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>(
    MOCK_NOTIFICATION_SETTINGS,
  );

  const handleToggle = (key: string, enabled: boolean) => {
    setSettings((current) =>
      current.map((setting) =>
        setting.key === key ? { ...setting, enabled } : setting,
      ),
    );
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Choose what you want to be notified about."
    >
      <Stack divider={<Divider />} spacing={0}>
        {settings.map((setting) => (
          <ToggleSetting
            key={setting.key}
            title={setting.title}
            description={setting.description}
            checked={setting.enabled}
            onChange={(checked) => handleToggle(setting.key, checked)}
          />
        ))}
      </Stack>
    </SettingsSection>
  );
}
