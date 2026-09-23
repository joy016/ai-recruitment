"use client";

import { Box, Tab, Tabs, useMediaQuery, useTheme } from "@mui/material";
import {
  AccountCircleOutlined,
  LockOutlined,
  NotificationsNoneOutlined,
  SecurityOutlined,
  TuneOutlined,
} from "@mui/icons-material";
import { SettingsSectionKey } from "../(types)/settings.types";

const SETTINGS_TABS: {
  key: SettingsSectionKey;
  label: string;
  icon: React.ReactElement;
}[] = [
  { key: "profile", label: "Profile", icon: <AccountCircleOutlined fontSize="small" /> },
  { key: "security", label: "Security", icon: <LockOutlined fontSize="small" /> },
  {
    key: "notifications",
    label: "Notifications",
    icon: <NotificationsNoneOutlined fontSize="small" />,
  },
  { key: "preferences", label: "Preferences", icon: <TuneOutlined fontSize="small" /> },
  {
    key: "permissions",
    label: "Access & Permissions",
    icon: <SecurityOutlined fontSize="small" />,
  },
];

type SettingsNavigationProps = {
  activeSection: SettingsSectionKey;
  onSectionChange: (section: SettingsSectionKey) => void;
};

export default function SettingsNavigation({
  activeSection,
  onSectionChange,
}: Readonly<SettingsNavigationProps>) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        bgcolor: "#f7fbff",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={activeSection}
        onChange={(_event, value: SettingsSectionKey) => onSectionChange(value)}
        orientation={isDesktop ? "vertical" : "horizontal"}
        variant={isDesktop ? "standard" : "scrollable"}
        scrollButtons={isDesktop ? false : "auto"}
        allowScrollButtonsMobile
        textColor="inherit"
        slotProps={{
          indicator: {
            sx: isDesktop
              ? { left: 0, width: 3, borderRadius: 2, bgcolor: "#1f80b6" }
              : { bgcolor: "#1f80b6", height: 3, borderRadius: 2 },
          },
        }}
        sx={{
          "& .MuiTab-root": {
            minHeight: 48,
            px: 2,
            py: 1.1,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "#5f7f96",
            alignItems: "center",
          },
          "& .MuiTab-root.Mui-selected": {
            color: "#12537c",
            bgcolor: { md: "#dff1fb" },
          },
        }}
      >
        {SETTINGS_TABS.map((tab) => (
          <Tab
            key={tab.key}
            value={tab.key}
            icon={tab.icon}
            iconPosition="start"
            label={tab.label}
          />
        ))}
      </Tabs>
    </Box>
  );
}
