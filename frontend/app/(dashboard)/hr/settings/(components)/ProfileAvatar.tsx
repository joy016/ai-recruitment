"use client";

import { useEffect, useState } from "react";
import { Avatar, Box, IconButton } from "@mui/material";
import { PhotoCamera } from "@mui/icons-material";

type ProfileAvatarProps = {
  firstName: string;
  lastName: string;
  editable?: boolean;
};

export default function ProfileAvatar({
  firstName,
  lastName,
  editable = false,
}: Readonly<ProfileAvatarProps>) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <Box sx={{ position: "relative", width: 88, height: 88 }}>
      <Avatar
        src={previewUrl ?? undefined}
        sx={{
          width: 88,
          height: 88,
          fontSize: "1.8rem",
          fontWeight: 700,
          bgcolor: "#1f80b6",
        }}
      >
        {!previewUrl && initials}
      </Avatar>
      {editable && (
        <IconButton
          component="label"
          size="small"
          aria-label="Change profile photo"
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
            accept="image/*"
            onChange={handleFileChange}
          />
        </IconButton>
      )}
    </Box>
  );
}
