"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import SettingsSection from "./SettingsSection";
import ProfileAvatar from "./ProfileAvatar";
import { UserProfile } from "../(types)/settings.types";
import { formatDateOnly } from "@/lib/utils/date";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setUser } from "@/lib/store/features/userSlice";
import { uploadProfilePhoto } from "@/lib/api/user";

// Mirrors the validation in UsersController.UploadPhoto.
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const describePhotoUploadError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 413) {
      return "Max file size is 2 MB.";
    }
    if (typeof error.response?.data === "string" && error.response.data) {
      return error.response.data;
    }
  }
  return "Failed to upload profile photo. Please try again.";
};

// Shows a short, readable ID (e.g. "EMP-1A2B3") instead of the full GUID.
const formatEmployeeId = (id: string | undefined) =>
  id ? `EMP-${id.replace(/-/g, "").slice(0, 5).toUpperCase()}` : "";

type ProfileSettingsProps = {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
};

const saveButtonSx = {
  textTransform: "none",
  borderRadius: 2,
  fontWeight: 700,
  background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
  "&:hover": {
    background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
  },
} as const;

export default function ProfileSettings({
  profile,
  onSave,
}: Readonly<ProfileSettingsProps>) {
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const dispatch = useAppDispatch();
  // The photo is only uploaded when "Save Changes" is clicked.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const clearPendingPhoto = () => {
    setPendingPhoto(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
  };

  const handlePhotoSelect = (file: File) => {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Max file size is 2 MB.");
      return;
    }

    setPhotoError(null);
    setPendingPhoto(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleFieldChange = (
    field: keyof Pick<
      UserProfile,
      | "firstName"
      | "lastName"
      | "email"
      | "phoneNumber"
      | "jobTitle"
      | "department"
      | "employeeId"
    >,
    value: string,
  ) => {
    setDraftProfile((current) => ({ ...current, [field]: value }));
  };

  const handleEdit = () => {
    setDraftProfile(profile);
    setShowSavedMessage(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftProfile(profile);
    clearPendingPhoto();
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (pendingPhoto) {
      setIsSaving(true);
      setPhotoError(null);
      try {
        const { photoUrl } = await uploadProfilePhoto(pendingPhoto);
        if (currentUser) {
          dispatch(setUser({ ...currentUser, photoUrl }));
        }
      } catch (error) {
        console.error("Profile photo upload failed:", error);
        setPhotoError(describePhotoUploadError(error));
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setSavedMessage(
      pendingPhoto
        ? "Profile photo updated."
        : "Profile changes saved locally. (Not yet connected to the backend.)",
    );
    clearPendingPhoto();
    onSave(draftProfile);
    setIsEditing(false);
    setShowSavedMessage(true);
  };

  return (
    <Stack spacing={2.5}>
      <SettingsSection
        title="Profile"
        description="Your personal and work information."
        action={
          isEditing ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                onClick={handleCancel}
                disabled={isSaving}
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isSaving}
                startIcon={
                  isSaving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
                sx={saveButtonSx}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="outlined"
              startIcon={<Edit fontSize="small" />}
              onClick={handleEdit}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Edit Profile
            </Button>
          )
        }
      >
        {showSavedMessage && !isEditing && (
          <Alert
            severity="success"
            sx={{ mb: 2.5 }}
            onClose={() => setShowSavedMessage(false)}
          >
            {savedMessage}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 3,
            flexWrap: "wrap",
          }}
        >
          <ProfileAvatar
            firstName={currentUser?.firstName ?? draftProfile.firstName}
            lastName={currentUser?.lastName ?? draftProfile.lastName}
            photoUrl={photoPreviewUrl ?? currentUser?.photoUrl}
            editable={isEditing && !isSaving}
            accept={ALLOWED_PHOTO_TYPES.join(",")}
            onFileSelect={handlePhotoSelect}
          />
          <Box>
            <Typography
              sx={{ fontWeight: 700, color: "#17456a", fontSize: "1.1rem" }}
            >
              {currentUser?.firstName} {currentUser?.lastName}
            </Typography>
            <Typography variant="body2" sx={{ color: "#5f7f96" }}>
              {currentUser?.roleName}
            </Typography>
            {isEditing && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.5,
                  color: photoError ? "error.main" : "#7893a8",
                }}
              >
                {photoError ??
                  (pendingPhoto
                    ? `New photo selected: ${pendingPhoto.name}. Click Save Changes to upload.`
                    : "JPEG, PNG, or WebP, up to 2 MB.")}
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 1.8,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <TextField
            size="small"
            label="First Name"
            value={currentUser?.firstName}
            onChange={(event) =>
              handleFieldChange("firstName", event.target.value)
            }
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Last Name"
            value={currentUser?.lastName}
            onChange={(event) =>
              handleFieldChange("lastName", event.target.value)
            }
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Email Address"
            type="email"
            value={currentUser?.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Phone Number"
            value={currentUser?.phoneNumber ?? ""}
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Job Title"
            value={currentUser?.roleName}
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Department"
            value={currentUser?.departmentName}
            onChange={(event) =>
              handleFieldChange("jobTitle", event.target.value)
            }
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Employee ID"
            value={formatEmployeeId(currentUser?.id)}
            onChange={(event) =>
              handleFieldChange("employeeId", event.target.value)
            }
            disabled
            fullWidth
          />
        </Box>
      </SettingsSection>

      <SettingsSection
        title="Account Overview"
        description="Read-only details managed by your organization."
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ color: "#6b879c" }}>
              Role
            </Typography>
            <Typography sx={{ fontWeight: 700, color: "#264a66", mt: 0.5 }}>
              {currentUser?.roleName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#6b879c" }}>
              Account Status
            </Typography>
            <Chip
              size="small"
              label={currentUser?.isActive ? "Active" : "Inactive"}
              sx={{
                mt: 0.6,
                fontWeight: 600,
                color: currentUser?.isActive ? "#1c8758" : "#8a8f98",
                bgcolor: currentUser?.isActive ? "#e8f7ef" : "#eef1f4",
              }}
            />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#6b879c" }}>
              Date Joined
            </Typography>
            <Typography sx={{ fontWeight: 700, color: "#264a66", mt: 0.5 }}>
              {formatDateOnly(currentUser?.createdAt)}
            </Typography>
          </Box>
        </Box>
      </SettingsSection>
    </Stack>
  );
}
