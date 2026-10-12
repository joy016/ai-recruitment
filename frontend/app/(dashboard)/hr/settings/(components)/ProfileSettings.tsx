"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { uploadProfilePicture } from "@/lib/api/user";

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
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const currentUser = useAppSelector((state) => state.user.currentUser);
  const dispatch = useAppDispatch();

  // The photo is only uploaded when "Save Changes" is clicked.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const handlePhotoSelect = (file: File) => {
    setPhotoError(null);
    setPendingPhoto(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const clearPendingPhoto = () => {
    setPendingPhoto(null);
    setPhotoPreviewUrl(null);
  };

  const handlePhotoUploaded = (photoUrl: string) => {
    if (!currentUser) {
      return;
    }
    dispatch(setUser({ ...currentUser, profilePictureUrl: photoUrl }));
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
    setPhotoError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (pendingPhoto && currentUser) {
      setIsSaving(true);
      try {
        const response = await uploadProfilePicture(currentUser.id, pendingPhoto);
        handlePhotoUploaded(response.photoUrl);
        clearPendingPhoto();
      } catch {
        setPhotoError("Failed to upload profile picture. Please try again.");
        return;
      } finally {
        setIsSaving(false);
      }
    }

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
            Profile changes saved locally. (Not yet connected to the backend.)
          </Alert>
        )}

        {photoError && (
          <Alert
            severity="error"
            sx={{ mb: 2.5 }}
            onClose={() => setPhotoError(null)}
          >
            {photoError}
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
            userId={currentUser?.id ?? ""}
            firstName={currentUser?.firstName ?? ""}
            lastName={currentUser?.lastName ?? ""}
            photoUrl={photoPreviewUrl ?? currentUser?.profilePictureUrl}
            editable={isEditing && !isSaving}
            onUploaded={handlePhotoUploaded}
            onFileSelected={handlePhotoSelect}
            uploading={isSaving}
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
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Last Name"
            value={currentUser?.lastName}
            onChange={(event) =>
              handleFieldChange("lastName", event.target.value)
            }
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Email Address"
            type="email"
            value={currentUser?.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Phone Number"
            value={currentUser?.phoneNumber}
            onChange={(event) =>
              handleFieldChange("phoneNumber", event.target.value)
            }
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Job Title"
            value={currentUser?.roleName}
            onChange={(event) =>
              handleFieldChange("jobTitle", event.target.value)
            }
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Department"
            value={currentUser?.departmentName}
            onChange={(event) =>
              handleFieldChange("jobTitle", event.target.value)
            }
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Employee ID"
            value={currentUser?.employeeNumber}
            onChange={(event) =>
              handleFieldChange("employeeId", event.target.value)
            }
            disabled={!isEditing}
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
