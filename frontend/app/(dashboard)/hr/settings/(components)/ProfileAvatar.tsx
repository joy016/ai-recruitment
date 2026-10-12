"use client";

import { useState } from "react";
import { Avatar, Box, CircularProgress, IconButton, Typography } from "@mui/material";
import { PhotoCamera } from "@mui/icons-material";
import { uploadProfilePicture } from "@/lib/api/user";

type ProfileAvatarProps = {
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  editable?: boolean;
  onUploaded?: (photoUrl: string) => void;
  /** When provided, the file is handed back instead of being uploaded immediately. */
  onFileSelected?: (file: File) => void;
  /** Shows the upload spinner while the parent uploads a deferred file. */
  uploading?: boolean;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ProfileAvatar({
  userId,
  firstName,
  lastName,
  photoUrl,
  editable = false,
  onUploaded,
  onFileSelected,
  uploading = false,
}: Readonly<ProfileAvatarProps>) {
  const [isSelfUploading, setIsSelfUploading] = useState(false);
  const isUploading = isSelfUploading || uploading;
  const [error, setError] = useState<string | null>(null);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError(null);

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    if (onFileSelected) {
      onFileSelected(file);
      return;
    }

    setIsSelfUploading(true);
    try {
      const response = await uploadProfilePicture(userId, file);
      onUploaded?.(response.photoUrl);
    } catch {
      setError("Failed to upload profile picture. Please try again.");
    } finally {
      setIsSelfUploading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Box sx={{ position: "relative", width: 88, height: 88 }}>
        <Avatar
          src={photoUrl ?? undefined}
          sx={{
            width: 88,
            height: 88,
            fontSize: "1.8rem",
            fontWeight: 700,
            bgcolor: "#1f80b6",
          }}
        >
          {!photoUrl && initials}
        </Avatar>
        {isUploading && (
          <CircularProgress
            size={88}
            thickness={2}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              color: "#ffffff",
            }}
          />
        )}
        {editable && (
          <IconButton
            component="label"
            size="small"
            aria-label="Change profile photo"
            disabled={isUploading}
            sx={{
              position: "absolute",
              bottom: -2,
              right: -2,
              bgcolor: "#ffffff",
              border: "1px solid #d3e8f5",
              "&:hover": { bgcolor: "#f2f9ff" },
            }}
          >
            <PhotoCamera fontSize="small" sx={{ color: "#1f80b6" }} />
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
            />
          </IconButton>
        )}
      </Box>
      {error && (
        <Typography variant="caption" sx={{ color: "#d32f2f", maxWidth: 160 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
