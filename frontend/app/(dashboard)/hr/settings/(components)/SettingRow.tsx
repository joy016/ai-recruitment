import { Box, Typography } from "@mui/material";

type SettingRowProps = {
  label: string;
  description?: React.ReactNode;
  control?: React.ReactNode;
};

export default function SettingRow({
  label,
  description,
  control,
}: Readonly<SettingRowProps>) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        gap: 1.2,
        py: 1.4,
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 600, color: "#264a66" }}>{label}</Typography>
        {description && (
          <Typography
            component="div"
            variant="body2"
            sx={{ color: "#6b879c", mt: 0.4 }}
          >
            {description}
          </Typography>
        )}
      </Box>
      {control && <Box sx={{ flexShrink: 0 }}>{control}</Box>}
    </Box>
  );
}
