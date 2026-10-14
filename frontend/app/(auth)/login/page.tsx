"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AutoAwesomeOutlined,
  EventAvailableOutlined,
  GroupsOutlined,
  LockOutlined,
  MailOutlined,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { login } from "@/lib/api/auth";
import { setToken } from "@/lib/utils/token";
import { useAppDispatch } from "@/lib/store/hooks";
import { setUser } from "@/lib/store/features/userSlice";
import { SESSION_EXPIRED_REASON } from "@/app/component/SessionGuard";

function SessionExpiredNotice() {
  const searchParams = useSearchParams();

  if (searchParams.get("reason") !== SESSION_EXPIRED_REASON) {
    return null;
  }

  return (
    <Alert severity="info" sx={{ mb: 2.5 }}>
      Your session has expired due to inactivity. Please sign in again to
      continue.
    </Alert>
  );
}

const describeLoginError = (error: unknown) => {
  if (axios.isAxiosError<{ title?: string; message?: string }>(error)) {
    if (!error.response) {
      return "Unable to reach the server. Please check your connection and try again.";
    }

    if (error.response.status === 401) {
      return "Invalid email or password.";
    }

    return (
      error.response.data?.title ??
      error.response.data?.message ??
      "Login failed. Please try again."
    );
  }

  return "Login failed. Please try again.";
};

const BRAND_FEATURES = [
  {
    icon: <AutoAwesomeOutlined fontSize="small" />,
    title: "AI-powered screening",
    description: "Rank and review applicants faster with smart matching.",
  },
  {
    icon: <EventAvailableOutlined fontSize="small" />,
    title: "Interview scheduling",
    description: "Plan, reschedule and track interviews in one place.",
  },
  {
    icon: <GroupsOutlined fontSize="small" />,
    title: "Team collaboration",
    description: "Keep your hiring team aligned on every candidate.",
  },
];

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    backgroundColor: "#f7fbfe",
    "& fieldset": { borderColor: "#d7e8f5" },
    "&:hover fieldset": { borderColor: "#9cc9e6" },
    "&.Mui-focused fieldset": { borderColor: "#2f90c5" },
  },
} as const;

function BrandPanel() {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        p: { md: 6, lg: 8 },
        color: "#ffffff",
        background:
          "linear-gradient(150deg, #0f3a5c 0%, #1a5f95 55%, #2f7fd0 100%)",
      }}
    >
      {/* Decorative glows */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          top: -140,
          right: -120,
          background:
            "radial-gradient(circle, rgba(124, 92, 255, 0.45) 0%, rgba(124, 92, 255, 0) 70%)",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          bottom: -160,
          left: -100,
          background:
            "radial-gradient(circle, rgba(59, 184, 164, 0.35) 0%, rgba(59, 184, 164, 0) 70%)",
        }}
      />

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", zIndex: 1 }}
      >
        <Image src="/icon.png" alt="" width={40} height={40} priority />
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
          HR AI Recruitment
        </Typography>
      </Stack>

      <Box sx={{ zIndex: 1, maxWidth: 460 }}>
        <Box
          sx={{
            width: 132,
            height: 132,
            mb: 4,
            borderRadius: "50%",
            boxShadow: "0 18px 50px rgba(8, 30, 60, 0.45)",
          }}
        >
          <Image
            src="/icon.png"
            alt="HR AI Recruitment Portal logo"
            width={132}
            height={132}
            priority
          />
        </Box>
        <Typography
          component="h2"
          sx={{
            fontWeight: 800,
            fontSize: { md: "2rem", lg: "2.4rem" },
            lineHeight: 1.2,
          }}
        >
          Hire smarter with an AI recruiting assistant.
        </Typography>
        <Typography sx={{ mt: 1.5, color: "rgba(255, 255, 255, 0.78)" }}>
          Everything your HR team needs to find, assess and hire the right
          people.
        </Typography>

        <Stack spacing={2.2} sx={{ mt: 4.5 }}>
          {BRAND_FEATURES.map((feature) => (
            <Stack
              key={feature.title}
              direction="row"
              spacing={1.8}
              sx={{ alignItems: "flex-start" }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                }}
              >
                {feature.icon}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {feature.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.72)" }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ zIndex: 1 }}>
        <Typography
          variant="caption"
          sx={{ display: "block", color: "rgba(255, 255, 255, 0.6)" }}
        >
          © {new Date().getFullYear()} HR AI Recruitment Portal
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", color: "rgba(255, 255, 255, 0.45)" }}
        >
          Developed and designed by Edijoy M. Lejas
        </Typography>
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      const response = await login({ email, password });
      setToken(response.token);
      dispatch(setUser(response.user));
      router.push("/hr/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(describeLoginError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
        backgroundColor: "#ffffff",
      }}
    >
      <BrandPanel />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2.5, sm: 4 },
          py: { xs: 5, md: 6 },
          background: {
            xs: "linear-gradient(140deg, #ecf7ff 0%, #f3fbff 45%, #eefbf5 100%)",
            md: "#ffffff",
          },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          {/* Compact brand header for small screens, where the panel is hidden */}
          <Stack
            spacing={1.2}
            sx={{
              display: { xs: "flex", md: "none" },
              alignItems: "center",
              mb: 3.5,
            }}
          >
            <Image
              src="/icon.png"
              alt="HR AI Recruitment Portal logo"
              width={84}
              height={84}
              priority
            />
            <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
              HR AI Recruitment Portal
            </Typography>
          </Stack>

          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.6rem", sm: "1.85rem" },
              color: "#17456a",
            }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ mt: 0.8, color: "#52718c" }}>
            Sign in with your work account to continue.
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 4 }}
          >
            {!loginError && (
              <Suspense fallback={null}>
                <SessionExpiredNotice />
              </Suspense>
            )}
            {loginError && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {loginError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
              sx={{ ...fieldSx, mb: 2.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlined sx={{ color: "#7d9ab0" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
              sx={{ ...fieldSx, mb: 3.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: "#7d9ab0" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((visible) => !visible)}
                        edge="end"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              sx={{
                borderRadius: 2.5,
                py: 1.4,
                fontWeight: 700,
                fontSize: "1rem",
                textTransform: "none",
                background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
                boxShadow: "0 6px 18px rgba(47, 144, 197, 0.25)",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
                },
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </Box>

          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 4, color: "#7d9ab0" }}
          >
            Having trouble signing in? Contact your HR administrator.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
