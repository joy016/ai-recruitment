"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import SettingsSection from "./SettingsSection";
import ProfileAvatar from "./ProfileAvatar";
import { DEPARTMENT_OPTIONS } from "../(constants)/constants";
import { UserProfile } from "../(types)/settings.types";
import { formatDateOnly } from "@/lib/utils/date";

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
    setIsEditing(false);
  };

  const handleSave = () => {
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
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} sx={saveButtonSx}>
                Save Changes
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
            firstName={draftProfile.firstName}
            lastName={draftProfile.lastName}
            editable={isEditing}
          />
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#17456a", fontSize: "1.1rem" }}>
              {draftProfile.firstName} {draftProfile.lastName}
            </Typography>
            <Typography variant="body2" sx={{ color: "#5f7f96" }}>
              {draftProfile.jobTitle}
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
            value={draftProfile.firstName}
            onChange={(event) => handleFieldChange("firstName", event.target.value)}
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Last Name"
            value={draftProfile.lastName}
            onChange={(event) => handleFieldChange("lastName", event.target.value)}
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Email Address"
            type="email"
            value={draftProfile.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Phone Number"
            value={draftProfile.phoneNumber}
            onChange={(event) =>
              handleFieldChange("phoneNumber", event.target.value)
            }
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            size="small"
            label="Job Title"
            value={draftProfile.jobTitle}
            onChange={(event) => handleFieldChange("jobTitle", event.target.value)}
            disabled={!isEditing}
            fullWidth
          />
          <Box>
            <Typography
              variant="body2"
              sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}
            >
              Department
            </Typography>
            <Select
              size="small"
              value={draftProfile.department}
              onChange={(event) =>
                handleFieldChange("department", event.target.value as string)
              }
              disabled={!isEditing}
              fullWidth
            >
              {DEPARTMENT_OPTIONS.map((department) => (
                <MenuItem key={department} value={department}>
                  {department}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <TextField
            size="small"
            label="Employee ID"
            value={draftProfile.employeeId}
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
              {profile.role}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#6b879c" }}>
              Account Status
            </Typography>
            <Chip
              size="small"
              label={profile.accountStatus}
              sx={{
                mt: 0.6,
                fontWeight: 600,
                color: profile.accountStatus === "Active" ? "#1c8758" : "#8a8f98",
                bgcolor:
                  profile.accountStatus === "Active" ? "#e8f7ef" : "#eef1f4",
              }}
            />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: "#6b879c" }}>
              Date Joined
            </Typography>
            <Typography sx={{ fontWeight: 700, color: "#264a66", mt: 0.5 }}>
              {formatDateOnly(profile.dateJoined)}
            </Typography>
          </Box>
        </Box>
      </SettingsSection>
    </Stack>
  );
}
