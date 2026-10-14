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
import { updatePhoneNumber, uploadProfilePicture } from "@/lib/api/user";
import { formatPhoneNumber, isCompletePhoneNumber } from "@/lib/utils/phone";

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

const joinLabels = (labels: (string | null)[]) =>
  labels.filter(Boolean).join(" and ");

const describeSaveSuccess = (saved: (string | null)[]) => {
  const text = `${joinLabels(saved)} updated successfully.`;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Returns an error message when any update failed, otherwise null. */
const describeSaveFailure = (
  saved: (string | null)[],
  failed: (string | null)[],
) => {
  const failedText = joinLabels(failed);
  if (!failedText) {
    return null;
  }

  const savedText = joinLabels(saved);
  return savedText
    ? `Your ${savedText} was updated, but the ${failedText} could not be saved. Please try again.`
    : `Failed to update your ${failedText}. Please try again.`;
};

export default function ProfileSettings({
  profile,
  onSave,
}: Readonly<ProfileSettingsProps>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

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
    setDraftProfile({
      ...profile,
      phoneNumber: formatPhoneNumber(currentUser?.phoneNumber),
    });
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
    if (!currentUser || isSaving) {
      return;
    }

    // Only fields that actually changed are sent. A photo counts as changed
    // only once a file was picked, not when the picker was merely opened.
    const originalPhone = formatPhoneNumber(currentUser.phoneNumber);
    const nextPhone = formatPhoneNumber(draftProfile.phoneNumber);
    const phoneChanged = nextPhone !== originalPhone;
    const photoChanged = pendingPhoto !== null;

    if (!phoneChanged && !photoChanged) {
      setPhotoError(null);
      setIsEditing(false);
      return;
    }

    if (phoneChanged && !isCompletePhoneNumber(nextPhone)) {
      setPhotoError("Please enter a complete phone number, e.g. +639 7099 80679.");
      return;
    }

    setPhotoError(null);
    setIsSaving(true);

    // Run both requests together; one failing must not cancel the other.
    const [photoResult, phoneResult] = await Promise.allSettled([
      pendingPhoto
        ? uploadProfilePicture(currentUser.id, pendingPhoto)
        : Promise.resolve(null),
      phoneChanged
        ? updatePhoneNumber(currentUser.id, { phoneNumber: nextPhone })
        : Promise.resolve(null),
    ]);

    const uploadedPhotoUrl =
      photoResult.status === "fulfilled" ? photoResult.value?.photoUrl : null;
    const phoneSucceeded = phoneChanged && phoneResult.status === "fulfilled";

    // Keep whatever did succeed, even if the other request failed.
    if (uploadedPhotoUrl || phoneSucceeded) {
      dispatch(
        setUser({
          ...currentUser,
          profilePictureUrl: uploadedPhotoUrl ?? currentUser.profilePictureUrl,
          phoneNumber: phoneSucceeded ? nextPhone : currentUser.phoneNumber,
        }),
      );
    }
    if (uploadedPhotoUrl) {
      clearPendingPhoto();
    }

    setIsSaving(false);

    const outcome = {
      saved: [
        uploadedPhotoUrl ? "profile picture" : null,
        phoneSucceeded ? "phone number" : null,
      ],
      failed: [
        photoChanged && !uploadedPhotoUrl ? "profile picture" : null,
        phoneChanged && !phoneSucceeded ? "phone number" : null,
      ],
    };

    const errorMessage = describeSaveFailure(outcome.saved, outcome.failed);
    if (errorMessage) {
      setPhotoError(errorMessage);
      return;
    }

    setSavedMessage(describeSaveSuccess(outcome.saved));
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
            {savedMessage}
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
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Last Name"
            value={currentUser?.lastName}
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Email Address"
            type="email"
            value={currentUser?.email}
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Phone Number"
            value={formatPhoneNumber(
              isEditing ? draftProfile.phoneNumber : currentUser?.phoneNumber,
            )}
            onChange={(event) =>
              handleFieldChange(
                "phoneNumber",
                formatPhoneNumber(event.target.value),
              )
            }
            placeholder="+639 7099 80679"
            helperText={isEditing ? "Format: +639 XXXX XXXXX" : undefined}
            disabled={!isEditing}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "tel", maxLength: 15 } }}
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
            disabled
            fullWidth
          />
          <TextField
            size="small"
            label="Employee ID"
            value={currentUser?.employeeNumber}
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
