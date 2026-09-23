import { Box, Stack, Typography } from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import { PermissionGroupData } from "../(types)/settings.types";

type PermissionGroupProps = {
  group: PermissionGroupData;
};

export default function PermissionGroup({
  group,
}: Readonly<PermissionGroupProps>) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 700, color: "#1d4f72", mb: 1 }}>
        {group.category}
      </Typography>
      <Stack spacing={0.8}>
        {group.permissions.map((permission) => (
          <Box
            key={permission.label}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            {permission.granted ? (
              <Check fontSize="small" sx={{ color: "#1c8758" }} />
            ) : (
              <Close fontSize="small" sx={{ color: "#c0392b" }} />
            )}
            <Typography
              variant="body2"
              sx={{ color: permission.granted ? "#264a66" : "#8a95a3" }}
            >
              {permission.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
