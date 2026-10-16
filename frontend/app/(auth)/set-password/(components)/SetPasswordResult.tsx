import Link from "next/link";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import {
  CheckCircleRounded,
  CloudOffRounded,
  ErrorOutlineRounded,
} from "@mui/icons-material";

export type SetPasswordResultVariant = "success" | "invalid" | "error";

type SetPasswordResultProps = {
  variant: SetPasswordResultVariant;
  /** Overrides the default message, e.g. with the backend's safe message. */
  message?: string;
  onRetry?: () => void;
};

const CONTENT: Record<
  SetPasswordResultVariant,
  { icon: React.ReactNode; iconBg: string; title: string; message: string }
> = {
  success: {
    icon: <CheckCircleRounded sx={{ fontSize: 44, color: "#1c8758" }} />,
    iconBg: "#e8f7ef",
    title: "Account activated",
    message:
      "Your password has been set successfully. You can now log in to your account.",
  },
  invalid: {
    icon: <ErrorOutlineRounded sx={{ fontSize: 44, color: "#d64545" }} />,
    iconBg: "#fdecec",
    title: "Link not valid",
    message:
      "Your activation link is invalid or has expired. Please contact your administrator.",
  },
  error: {
    icon: <CloudOffRounded sx={{ fontSize: 44, color: "#b36a00" }} />,
    iconBg: "#fff3e3",
    title: "Something went wrong",
    message:
      "We couldn't check your activation link. Please check your connection and try again.",
  },
};

const primaryButtonSx = {
  mt: 4,
  borderRadius: 2.5,
  py: 1.4,
  fontWeight: 700,
  fontSize: "1rem",
  textTransform: "none",
  background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
  boxShadow: "0 6px 18px rgba(47, 144, 197, 0.25)",
  "&:hover": {
    background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
  },
} as const;

const secondaryButtonSx = {
  mt: 1.5,
  borderRadius: 2.5,
  py: 1.3,
  fontWeight: 700,
  textTransform: "none",
} as const;

export default function SetPasswordResult({
  variant,
  message,
  onRetry,
}: Readonly<SetPasswordResultProps>) {
  const content = CONTENT[variant];

  return (
    <Box sx={{ textAlign: "center" }}>
      <Box
        sx={{
          mx: "auto",
          mb: 2.5,
          width: 80,
          height: 80,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: content.iconBg,
        }}
      >
        {content.icon}
      </Box>
      <Typography
        component="h1"
        sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#17456a" }}
      >
        {content.title}
      </Typography>
      <Typography sx={{ mt: 1, color: "#52718c" }}>
        {message || content.message}
      </Typography>

      {variant === "success" && (
        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            color: "#7d9ab0",
          }}
        >
          <CircularProgress size={14} color="inherit" />
          <Typography variant="body2">Redirecting you to login...</Typography>
        </Box>
      )}

      {variant === "error" && onRetry && (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onRetry}
          sx={primaryButtonSx}
        >
          Try Again
        </Button>
      )}

      <Button
        component={Link}
        href="/login"
        fullWidth
        variant={variant === "success" ? "contained" : "outlined"}
        size="large"
        sx={
          variant === "success"
            ? primaryButtonSx
            : {
                ...secondaryButtonSx,
                mt: variant === "error" && onRetry ? 1.5 : 4,
              }
        }
      >
        Go to Login
      </Button>
    </Box>
  );
}
