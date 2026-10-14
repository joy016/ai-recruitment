"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Tab, Tabs } from "@mui/material";
import { AdminPanelSettingsOutlined, PeopleOutlined } from "@mui/icons-material";

const ACCOUNTS_TABS = [
  {
    label: "User Management",
    href: "/hr/accounts",
    icon: <PeopleOutlined fontSize="small" />,
  },
  {
    label: "Role & Permissions",
    href: "/hr/accounts/roles",
    icon: <AdminPanelSettingsOutlined fontSize="small" />,
  },
];

export default function AccountsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  // Longest match wins so /hr/accounts/roles doesn't also select /hr/accounts.
  const activeTab =
    [...ACCOUNTS_TABS]
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
      )?.href ?? ACCOUNTS_TABS[0].href;

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          borderRadius: 3,
          border: "1px solid #d7e8f5",
          bgcolor: "#f7fbff",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          textColor="inherit"
          slotProps={{
            indicator: {
              sx: { bgcolor: "#1f80b6", height: 3, borderRadius: 2 },
            },
          }}
          sx={{
            "& .MuiTab-root": {
              minHeight: 48,
              px: 2.2,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "#5f7f96",
            },
            "& .MuiTab-root.Mui-selected": { color: "#12537c" },
          }}
        >
          {ACCOUNTS_TABS.map((tab) => (
            <Tab
              key={tab.href}
              value={tab.href}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              component={Link}
              href={tab.href}
            />
          ))}
        </Tabs>
      </Box>
      {children}
    </Box>
  );
}
