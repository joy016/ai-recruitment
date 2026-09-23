import { Box, Divider, Paper, Typography } from "@mui/material";

type SettingsSectionProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export default function SettingsSection({
  title,
  description,
  action,
  children,
}: Readonly<SettingsSectionProps>) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.75, sm: 2.5 },
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          flexWrap: "wrap",
          gap: 1.2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, color: "#17456a", fontSize: "1.05rem" }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Divider sx={{ my: 2 }} />
      {children}
    </Paper>
  );
}
