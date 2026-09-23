"use client";

import { useState } from "react";
import { Alert, Box, Button, MenuItem, Select, Snackbar, Typography } from "@mui/material";
import SettingsSection from "./SettingsSection";
import {
  DATE_FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
  MOCK_PREFERENCES,
  THEME_OPTIONS,
  TIMEZONE_OPTIONS,
} from "../(constants)/constants";
import { ThemePreference, UserPreferences } from "../(types)/settings.types";

export default function PreferenceSettings() {
  const [preferences, setPreferences] = useState<UserPreferences>(MOCK_PREFERENCES);
  const [isToastOpen, setIsToastOpen] = useState(false);

  const handleChange = (
    field: keyof UserPreferences,
    value: string,
  ) => {
    setPreferences((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    setIsToastOpen(true);
  };

  return (
    <SettingsSection
      title="Preferences"
      description="Personalize how the portal looks and behaves for you."
      action={
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 700,
            background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
            "&:hover": {
              background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
            },
          }}
        >
          Save Preferences
        </Button>
      }
    >
      <Box
        sx={{
          display: "grid",
          gap: 1.8,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}>
            Language
          </Typography>
          <Select
            size="small"
            value={preferences.language}
            onChange={(event) => handleChange("language", event.target.value)}
            fullWidth
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <MenuItem key={language} value={language}>
                {language}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}>
            Timezone
          </Typography>
          <Select
            size="small"
            value={preferences.timezone}
            onChange={(event) => handleChange("timezone", event.target.value)}
            fullWidth
          >
            {TIMEZONE_OPTIONS.map((timezone) => (
              <MenuItem key={timezone} value={timezone}>
                {timezone}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}>
            Date Format
          </Typography>
          <Select
            size="small"
            value={preferences.dateFormat}
            onChange={(event) => handleChange("dateFormat", event.target.value)}
            fullWidth
          >
            {DATE_FORMAT_OPTIONS.map((format) => (
              <MenuItem key={format} value={format}>
                {format}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ color: "#52718c", mb: 0.6, fontWeight: 600 }}>
            Theme
          </Typography>
          <Select
            size="small"
            value={preferences.theme}
            onChange={(event) =>
              handleChange("theme", event.target.value as ThemePreference)
            }
            fullWidth
          >
            {THEME_OPTIONS.map((theme) => (
              <MenuItem key={theme} value={theme}>
                {theme}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      <Snackbar
        open={isToastOpen}
        autoHideDuration={2600}
        onClose={() => setIsToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setIsToastOpen(false)}
          sx={{ width: "100%" }}
        >
          Preferences saved locally. (Not yet connected to the backend.)
        </Alert>
      </Snackbar>
    </SettingsSection>
  );
}
