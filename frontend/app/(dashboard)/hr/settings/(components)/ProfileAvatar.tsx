"use client";

import { Avatar, Box, IconButton } from "@mui/material";
import { PhotoCamera } from "@mui/icons-material";

type ProfileAvatarProps = {
  firstName: string;
  lastName: string;
  /** Saved photo URL or a local preview of a not-yet-saved file. */
  photoUrl?: string | null;
  editable?: boolean;
  accept?: string;
  onFileSelect?: (file: File) => void;
};

export default function ProfileAvatar({
  firstName,
  lastName,
  photoUrl,
  editable = false,
  accept = "image/*",
  onFileSelect,
}: Readonly<ProfileAvatarProps>) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";
    if (file) {
      onFileSelect?.(file);
    }
  };

  return (
    <Box sx={{ position: "relative", width: 88, height: 88 }}>
      <Avatar
        src={photoUrl ?? undefined}
        alt={`${firstName} ${lastName}`}
        sx={{
          width: 88,
          height: 88,
          fontSize: "1.8rem",
          fontWeight: 700,
          bgcolor: "#1f80b6",
        }}
      >
        {initials}
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
          <input hidden type="file" accept={accept} onChange={handleFileChange} />
        </IconButton>
      )}
    </Box>
  );
}
