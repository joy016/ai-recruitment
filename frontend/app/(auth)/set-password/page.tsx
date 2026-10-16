"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import SetPasswordForm from "./(components)/SetPasswordForm";
import SetPasswordResult from "./(components)/SetPasswordResult";
import { setInvitationPassword, validateInvitation } from "@/lib/api/user";
import { PASSWORD_SET_LOGIN_FLAG } from "@/constant/password-setup";

type SetPasswordStatus =
  "validating" | "form" | "success" | "invalid" | "error";

const REDIRECT_DELAY_MS = 2500;

/**
 * Turns an API failure into a message that is safe to show. Never includes
 * the request itself, which carries the token and password.
 */
const describeRequestError = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response) {
      return error.code === "ECONNABORTED"
        ? "The request timed out. Please try again."
        : "Unable to reach the server. Please check your connection and try again.";
    }
    if (error.response.status === 429) {
      return "Too many attempts. Please wait a minute and try again.";
    }
    if (error.response.data?.message) {
      return error.response.data.message;
    }
  }
  return "Something went wrong. Please try again.";
};

// Logs only the HTTP status: the error object holds the token and password.
const logRequestFailure = (context: string, error: unknown) => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  console.error(`${context} failed${status ? ` (HTTP ${status})` : ""}.`);
};

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<SetPasswordStatus>(
    token ? "validating" : "invalid",
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);
  const [validationAttempt, setValidationAttempt] = useState(0);

  // Validation never consumes the token, so it's safe on every load/refresh.
  useEffect(() => {
    // Without a token the initial state is already "invalid".
    if (!token) return;

    let cancelled = false;
    const checkInvitation = async () => {
      try {
        const result = await validateInvitation(token);
        if (cancelled) return;
        if (result.isValid) {
          setEmail(result.email);
          setStatus("form");
        } else {
          setStatusMessage(result.message);
          setStatus("invalid");
        }
      } catch (error) {
        if (cancelled) return;
        logRequestFailure("Invitation validation", error);
        setStatusMessage(describeRequestError(error));
        setStatus("error");
      }
    };

    checkInvitation();
    return () => {
      cancelled = true;
    };
  }, [token, validationAttempt]);

  const handleRetryValidation = () => {
    setStatus("validating");
    setStatusMessage("");
    setValidationAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      router.replace(`/login?${PASSWORD_SET_LOGIN_FLAG}=1`);
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, router]);

  const handleSubmit = async (password: string, confirmPassword: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await setInvitationPassword({
        token,
        newPassword: password,
        confirmPassword,
      });
      setStatus("success");
    } catch (error) {
      logRequestFailure("Setting the initial password", error);

      // Every failure is a 400 with a message; re-check the token to tell an
      // invalid/expired/used link apart from a rejected password.
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        try {
          const result = await validateInvitation(token);
          if (!result.isValid) {
            setStatusMessage(result.message);
            setStatus("invalid");
            return;
          }
        } catch {
          // Fall through and show the original error on the form.
        }
      }
      setSubmitError(describeRequestError(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (status === "validating") {
    return (
      <Box sx={{ textAlign: "center", py: 5 }}>
        <CircularProgress size={32} />
        <Typography sx={{ mt: 2, color: "#52718c" }}>
          Checking your activation link...
        </Typography>
      </Box>
    );
  }

  if (status !== "form") {
    return (
      <SetPasswordResult
        variant={status}
        message={statusMessage || undefined}
        onRetry={status === "error" ? handleRetryValidation : undefined}
      />
    );
  }

  return (
    <>
      <Typography
        component="h1"
        sx={{
          fontWeight: 800,
          fontSize: { xs: "1.5rem", sm: "1.75rem" },
          color: "#17456a",
          textAlign: "center",
        }}
      >
        Set Up Your Password
      </Typography>
      <Typography
        sx={{
          mt: 0.8,
          mb: email ? 1.5 : 3.5,
          color: "#52718c",
          textAlign: "center",
        }}
      >
        Welcome to AI Recruitment Hub! Create your password to activate your
        account.
      </Typography>
      {email && (
        <Typography
          variant="body2"
          sx={{ mb: 3.5, textAlign: "center", color: "#6b879c" }}
        >
          Activating{" "}
          <Box component="span" sx={{ fontWeight: 700, color: "#17456a" }}>
            {email}
          </Box>
        </Typography>
      )}

      <SetPasswordForm
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />

      <Typography
        variant="body2"
        align="center"
        sx={{ mt: 3, color: "#7d9ab0" }}
      >
        Already activated?{" "}
        <Box
          component={Link}
          href="/login"
          sx={{ color: "#1f80b6", fontWeight: 600, textDecoration: "none" }}
        >
          Go to Login
        </Box>
      </Typography>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: { xs: 4, sm: 6 },
        background:
          "linear-gradient(140deg, #ecf7ff 0%, #f3fbff 45%, #eefbf5 100%)",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 460 }}>
        <Stack spacing={1} sx={{ alignItems: "center", mb: 2.5 }}>
          <Image
            src="/icon.png"
            alt="AI Recruitment Hub logo"
            width={72}
            height={72}
            priority
          />
          <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
            AI Recruitment Hub
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            border: "1px solid #d7e8f5",
            boxShadow: "0 18px 50px rgba(23, 69, 106, 0.08)",
          }}
        >
          {/* useSearchParams needs a Suspense boundary in the App Router. */}
          <Suspense
            fallback={
              <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            }
          >
            <SetPasswordContent />
          </Suspense>
        </Paper>

        <Typography
          variant="caption"
          align="center"
          sx={{ display: "block", mt: 3, color: "#8aa3b6" }}
        >
          © {new Date().getFullYear()} HR AI Recruitment Portal
        </Typography>
      </Box>
    </Box>
  );
}
