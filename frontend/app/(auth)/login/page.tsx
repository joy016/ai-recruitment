"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { login } from "@/lib/api/auth";
import { setToken } from "@/lib/utils/token";
import { useAppDispatch } from "@/lib/store/hooks";
import { setUser } from "@/lib/store/features/userSlice";

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(140deg, #ecf7ff 0%, #f3fbff 45%, #eefbf5 100%)",
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: "1px solid #d7e8f5",
            backgroundColor: "#fffffff5",
            backdropFilter: "blur(8px)",
          }}
        >
          <Typography
            variant="h5"
            align="center"
            sx={{ fontWeight: 700, color: "#17456a" }}
          >
            HR Login
          </Typography>
          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 0.8, color: "#52718c" }}
          >
            Sign in with your work account
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 3 }}
          >
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
              sx={{ mb: 2.5 }}
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
              sx={{ mb: 3.5 }}
              slotProps={{
                input: {
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
                borderRadius: 3,
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
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
