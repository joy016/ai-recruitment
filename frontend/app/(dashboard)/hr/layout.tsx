"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/utils/token";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu as MuiMenu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CheckCircle,
  Close,
  Dashboard,
  Description,
  Group,
  Logout,
  ManageAccounts,
  Menu,
  NotificationsNone,
  PersonOutlined,
  Schedule,
  Settings,
  WarningAmber,
} from "@mui/icons-material";

const drawerWidth = 260;

const navItems = [
  { label: "Dashboard", href: "/hr/dashboard", icon: <Dashboard /> },
  { label: "Candidates", href: "/hr/candidates", icon: <Group /> },
  { label: "Job Posts", href: "/hr/jobs", icon: <Description /> },
  { label: "Accounts", href: "/hr/accounts", icon: <ManageAccounts /> },
  { label: "Settings", href: "/hr/settings", icon: <Settings /> },
];

type NotificationType = "success" | "warning" | "info";

type RecruiterNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: NotificationType;
  unread?: boolean;
};

const recruiterNotifications: RecruiterNotification[] = [
  {
    id: "n1",
    title: "AI Screening Passed",
    detail: "Sarah Jones passed AI screening for Frontend Developer.",
    time: "5m ago",
    type: "success",
    unread: true,
  },
  {
    id: "n2",
    title: "Meeting Declined",
    detail: "Mark Daniel declined the Initial Interview schedule.",
    time: "32m ago",
    type: "warning",
    unread: true,
  },
  {
    id: "n3",
    title: "Interview Reminder",
    detail: "Technical interview with APP-1001 starts in 2 hours.",
    time: "1h ago",
    type: "info",
  },
];

const getNotificationAccent = (type: NotificationType) => {
  if (type === "success") {
    return { color: "#1c8758", bg: "#e8f7ef", icon: <CheckCircle /> };
  }

  if (type === "warning") {
    return { color: "#b36a00", bg: "#fff3e3", icon: <WarningAmber /> };
  }

  return { color: "#1f80b6", bg: "#e8f4fb", icon: <Schedule /> };
};

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const accountMenuOpen = Boolean(accountAnchorEl);
  const closeAccountMenu = () => setAccountAnchorEl(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const unreadNotifications = recruiterNotifications.filter(
    (item) => item.unread,
  ).length;

  const drawerContent = (
    <Box sx={{ height: "100%", bgcolor: "#f7fbff" }}>
      <Toolbar sx={{ minHeight: "72px !important" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#17456a" }}>
          HR Dashboard
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.2, py: 1 }}>
        {navItems.map((item) => {
          const selected = pathname === item.href;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => {
                if (!isDesktop) {
                  setMobileOpen(false);
                }
              }}
              selected={selected}
              sx={{
                borderRadius: 2.2,
                mb: 0.7,
                color: selected ? "#12537c" : "#35566f",
                "& .MuiListItemIcon-root": {
                  color: selected ? "#1f80b6" : "#5f8199",
                  minWidth: 38,
                },
                "&.Mui-selected": {
                  bgcolor: "#dff1fb",
                },
                "&.Mui-selected:hover": {
                  bgcolor: "#d1eaf8",
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f2f9ff" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: "#ffffffd9",
          backdropFilter: "blur(6px)",
          color: "#264a66",
          borderBottom: "1px solid #d7e8f5",
        }}
      >
        <Toolbar
          sx={{ minHeight: { xs: "64px !important", md: "72px !important" } }}
        >
          {!isDesktop && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileOpen((open) => !open)}
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
          )}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1rem", sm: "1.1rem" },
              lineHeight: 1.2,
            }}
          >
            Human Resource Portal
          </Typography>
          <Box sx={{ ml: "auto" }}>
            <IconButton
              aria-label="Open notifications"
              onClick={() => setNotificationsOpen(true)}
              sx={{
                color: "#1f80b6",
                bgcolor: "#ecf7ff",
                border: "1px solid #d3e8f5",
                "&:hover": { bgcolor: "#e2f1fb" },
              }}
            >
              <Badge color="error" badgeContent={unreadNotifications}>
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Box
              onMouseEnter={(event) =>
                setAccountAnchorEl(event.currentTarget)
              }
              onMouseLeave={closeAccountMenu}
              sx={{ display: "inline-flex", ml: 1 }}
            >
              <IconButton
                aria-label="Account menu"
                aria-controls={accountMenuOpen ? "account-menu" : undefined}
                aria-haspopup="true"
                onClick={(event) => setAccountAnchorEl(event.currentTarget)}
                sx={{ p: 0.4 }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "#1f80b6",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                  }}
                >
                  HR
                </Avatar>
              </IconButton>

              <MuiMenu
                id="account-menu"
                anchorEl={accountAnchorEl}
                open={accountMenuOpen}
                onClose={closeAccountMenu}
                disableRestoreFocus
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                  list: {
                    onMouseLeave: closeAccountMenu,
                    sx: { minWidth: 180 },
                  },
                  paper: { sx: { pointerEvents: "auto" } },
                }}
                sx={{ pointerEvents: "none" }}
              >
                <MenuItem
                  onClick={() => {
                    closeAccountMenu();
                    router.push("/hr/settings");
                  }}
                >
                  <ListItemIcon>
                    <PersonOutlined fontSize="small" />
                  </ListItemIcon>
                  My Account
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    closeAccountMenu();
                    clearToken();
                    router.push("/login");
                  }}
                >
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </MuiMenu>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: "min(82vw, 320px)",
              borderRight: "1px solid #d7e8f5",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid #d7e8f5",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          overflowX: "hidden",
          p: { xs: 1.25, sm: 2.5, md: 3.5 },
          mt: { xs: "64px", md: "72px" },
          background:
            "radial-gradient(circle at top right, #e8f6ff 0%, #f6fbff 40%, #f1fbf7 100%)",
        }}
      >
        {children}
      </Box>

      <Drawer
        anchor="right"
        variant="temporary"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 390 },
            borderLeft: "1px solid #d7e8f5",
            bgcolor: "#f8fcff",
          },
        }}
      >
        <Box sx={{ p: 2.2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#17456a" }}>
              Notifications
            </Typography>
            <IconButton
              aria-label="Close notifications"
              onClick={() => setNotificationsOpen(false)}
              size="small"
              sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
            >
              <Close />
            </IconButton>
          </Box>
          <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
            Track screening outcomes, interview updates, and candidate actions.
          </Typography>
        </Box>
        <Divider />

        <List sx={{ px: 1.2, py: 1.2 }}>
          {recruiterNotifications.map((item) => {
            const accent = getNotificationAccent(item.type);

            return (
              <ListItem key={item.id} disableGutters sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: "100%",
                    p: 1.2,
                    borderRadius: 2,
                    border: "1px solid #dcecf8",
                    bgcolor: "#ffffff",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        bgcolor: accent.bg,
                        color: accent.color,
                        display: "grid",
                        placeItems: "center",
                        "& .MuiSvgIcon-root": { fontSize: 18 },
                      }}
                    >
                      {accent.icon}
                    </Box>

                    <Typography
                      sx={{ fontWeight: 700, color: "#274d68", flex: 1 }}
                    >
                      {item.title}
                    </Typography>

                    {item.unread ? (
                      <Chip
                        label="New"
                        size="small"
                        sx={{
                          bgcolor: "#e9f5ff",
                          color: "#1f80b6",
                          fontWeight: 700,
                        }}
                      />
                    ) : null}
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{ mt: 0.9, color: "#4f7189" }}
                  >
                    {item.detail}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.7, color: "#7893a8", display: "block" }}
                  >
                    {item.time}
                  </Typography>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
    </Box>
  );
}
