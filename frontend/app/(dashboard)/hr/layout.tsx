"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/utils/token";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearUser } from "@/lib/store/features/userSlice";
import SessionGuard from "@/app/component/SessionGuard";
import PermissionsLoader from "@/app/component/PermissionsLoader";
import NotificationPanel from "@/app/component/NotificationPanel";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import { NOTIFICATION_BADGE_MAX } from "@/constant/notifications";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { DASHBOARD_PERMISSIONS, PERMISSIONS } from "@/constant/permissions";
import InboxPreviewMenu from "@/app/component/InboxPreviewMenu";
import { MOCK_UNREAD_INBOX_COUNT } from "./inbox/(constants)/mockInbox";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
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
  Dashboard,
  Description,
  Group,
  InboxOutlined,
  Logout,
  ManageAccounts,
  Menu,
  NotificationsNone,
  PersonOutlined,
  Settings,
} from "@mui/icons-material";

const drawerWidth = 260;

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactElement;
  /** Shown when the user has any of these; omitted = available to every user. */
  requiredAny?: readonly string[];
  /** Unread count pill; hidden at 0. */
  badge?: number;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/hr/dashboard",
    icon: <Dashboard />,
    requiredAny: DASHBOARD_PERMISSIONS,
  },
  {
    label: "Candidates",
    href: "/hr/candidates",
    icon: <Group />,
    requiredAny: [PERMISSIONS.candidates.view],
  },
  {
    label: "Inbox",
    href: "/hr/inbox",
    icon: <InboxOutlined />,
    requiredAny: [PERMISSIONS.candidates.view],
    // TODO(wire-up): live unread count from the mail API.
    badge: MOCK_UNREAD_INBOX_COUNT,
  },
  {
    label: "Job Posts",
    href: "/hr/jobs",
    icon: <Description />,
    requiredAny: [PERMISSIONS.jobPosts.view],
  },
  {
    label: "Accounts",
    href: "/hr/accounts",
    icon: <ManageAccounts />,
    requiredAny: [PERMISSIONS.accounts.view],
  },
  // Personal profile, security and own-permissions view: every signed-in user.
  { label: "Settings", href: "/hr/settings", icon: <Settings /> },
];

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const { hasAnyPermission } = usePermissions();
  // Gated items stay hidden until permissions load (deny by default).
  const visibleNavItems = navItems.filter(
    (item) => !item.requiredAny || hasAnyPermission(item.requiredAny),
  );
  const userInitials = currentUser
    ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()
    : "HR";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const accountMenuOpen = Boolean(accountAnchorEl);
  const closeAccountMenu = () => setAccountAnchorEl(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const unreadNotifications = useUnreadNotificationCount(currentUser !== null);
  const unreadLabel =
    unreadNotifications.count > NOTIFICATION_BADGE_MAX
      ? `${NOTIFICATION_BADGE_MAX}+`
      : String(unreadNotifications.count);

  const drawerContent = (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: "#ffffff",
        // Same brand gradient as the login page panel.
        background:
          "linear-gradient(170deg, #0f3a5c 0%, #1a5f95 60%, #2f7fd0 100%)",
      }}
    >
      {/* Decorative glows */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: "50%",
          top: -120,
          right: -140,
          background:
            "radial-gradient(circle, rgba(124, 92, 255, 0.4) 0%, rgba(124, 92, 255, 0) 70%)",
          pointerEvents: "none",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          bottom: -120,
          left: -120,
          background:
            "radial-gradient(circle, rgba(59, 184, 164, 0.3) 0%, rgba(59, 184, 164, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      <Toolbar
        sx={{
          minHeight: "72px !important",
          py: 2.2,
          gap: 1.3,
          position: "relative",
        }}
      >
        <Image src="/icon.png" alt="" width={40} height={40} priority />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.3 }}
          >
            HR AI Recruitment
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255, 255, 255, 0.65)" }}
          >
            Hiring dashboard
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)" }} />

      <Typography
        variant="overline"
        sx={{
          px: 3,
          pt: 2,
          color: "rgba(255, 255, 255, 0.5)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          position: "relative",
        }}
      >
        Menu
      </Typography>
      <List sx={{ px: 1.5, py: 0.5, flexGrow: 1, position: "relative" }}>
        {visibleNavItems.map((item) => {
          const selected =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                position: "relative",
                borderRadius: 2.5,
                mb: 0.6,
                py: 1.1,
                color: selected ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                "& .MuiListItemIcon-root": {
                  color: selected ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
                  minWidth: 38,
                },
                "& .MuiListItemText-primary": {
                  fontWeight: selected ? 700 : 500,
                },
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  color: "#ffffff",
                },
                "&.Mui-selected": {
                  bgcolor: "rgba(255, 255, 255, 0.16)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.18)",
                },
                "&.Mui-selected:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                },
                // Accent bar on the active item, using the brand teal.
                "&.Mui-selected::before": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  borderRadius: 3,
                  bgcolor: "#3bb8a4",
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              {item.badge ? (
                <Box
                  component="span"
                  sx={{
                    minWidth: 22,
                    height: 20,
                    px: 0.8,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#0f3a5c",
                    bgcolor: "#ffffff",
                  }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Box>
              ) : null}
            </ListItemButton>
          );
        })}
      </List>

      {currentUser && (
        <Box
          sx={{
            position: "relative",
            m: 1.5,
            p: 1.3,
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            borderRadius: 2.5,
            bgcolor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          <Avatar
            src={currentUser.profilePictureUrl ?? undefined}
            sx={{
              width: 38,
              height: 38,
              bgcolor: "#3bb8a4",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
          >
            {userInitials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.3 }}
            >
              {currentUser.firstName} {currentUser.lastName}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ display: "block", color: "rgba(255, 255, 255, 0.65)" }}
            >
              {currentUser.roleName}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f2f9ff" }}>
      <CssBaseline />
      <SessionGuard />
      <PermissionsLoader />
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
          <Box
            sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}
          >
            <InboxPreviewMenu />
            <IconButton
              aria-label={
                unreadNotifications.count > 0
                  ? `Open notifications, ${unreadLabel} unread`
                  : "Open notifications"
              }
              onClick={() => setNotificationsOpen(true)}
              sx={{
                color: "#1f80b6",
                bgcolor: "#ecf7ff",
                border: "1px solid #d3e8f5",
                "&:hover": { bgcolor: "#e2f1fb" },
              }}
            >
              {/* MUI hides the badge at 0 and renders "99+" above max. */}
              <Badge
                color="error"
                badgeContent={unreadNotifications.count}
                max={NOTIFICATION_BADGE_MAX}
              >
                <NotificationsNone />
              </Badge>
            </IconButton>
            <Box
              onMouseEnter={(event) => setAccountAnchorEl(event.currentTarget)}
              onMouseLeave={closeAccountMenu}
              sx={{ display: "inline-flex", alignItems: "center" }}
            >
              <IconButton
                aria-label="Account menu"
                aria-controls={accountMenuOpen ? "account-menu" : undefined}
                aria-haspopup="true"
                onClick={(event) => setAccountAnchorEl(event.currentTarget)}
                sx={{ p: 0.4 }}
              >
                <Avatar
                  src={currentUser?.profilePictureUrl ?? undefined}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "#1f80b6",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                  }}
                >
                  {userInitials}
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
                    dispatch(clearUser());
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
              borderRight: "none",
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
              borderRight: "none",
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

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        unreadCount={unreadNotifications.count}
        onItemRead={() => unreadNotifications.adjust(-1)}
        onAllRead={unreadNotifications.reset}
        onSyncUnreadCount={unreadNotifications.refresh}
      />
    </Box>
  );
}
