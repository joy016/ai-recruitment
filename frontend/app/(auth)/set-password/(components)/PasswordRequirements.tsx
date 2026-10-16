import { Box, Stack, Typography } from "@mui/material";
import { CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { PASSWORD_REQUIREMENTS } from "@/lib/utils/password";

type PasswordRequirementsProps = {
  password: string;
};

export default function PasswordRequirements({
  password,
}: Readonly<PasswordRequirementsProps>) {
  return (
    <Box
      sx={{
        p: 1.6,
        borderRadius: 2.5,
        bgcolor: "#f7fbfe",
        border: "1px solid #e1eef7",
      }}
    >
      <Typography
        variant="caption"
        sx={{ display: "block", mb: 0.8, fontWeight: 700, color: "#52718c" }}
      >
        Your password must have:
      </Typography>
      <Stack
        component="ul"
        spacing={0.6}
        sx={{ m: 0, p: 0, listStyle: "none" }}
      >
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = requirement.test(password);
          return (
            <Box
              component="li"
              key={requirement.key}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              {met ? (
                <CheckCircle sx={{ fontSize: 18, color: "#1c8758" }} />
              ) : (
                <RadioButtonUnchecked sx={{ fontSize: 18, color: "#b6c6d3" }} />
              )}
              <Typography
                variant="body2"
                sx={{
                  color: met ? "#1c8758" : "#6b879c",
                  fontWeight: met ? 600 : 400,
                  transition: "color 0.15s",
                }}
              >
                {requirement.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
