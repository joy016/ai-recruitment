import { Alert, Box, Chip, Typography } from "@mui/material";
import SettingsSection from "./SettingsSection";
import PermissionGroup from "./PermissionGroup";
import { MOCK_PERMISSION_GROUPS, MOCK_USER_PROFILE } from "../(constants)/constants";

export default function PermissionSettings() {
  return (
    <SettingsSection
      title="Access & Permissions"
      description="Permissions are controlled by your assigned role and managed separately under Accounts."
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: "#6b879c" }}>
          Current Role
        </Typography>
        <Chip
          size="small"
          label={MOCK_USER_PROFILE.role}
          sx={{ fontWeight: 700, color: "#1f80b6", bgcolor: "#e8f4fb" }}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
        }}
      >
        {MOCK_PERMISSION_GROUPS.map((group) => (
          <PermissionGroup key={group.category} group={group} />
        ))}
      </Box>

      <Alert severity="info" sx={{ mt: 2.5 }}>
        This is a read-only view. Role and permission management is handled
        under Accounts.
      </Alert>
    </SettingsSection>
  );
}
