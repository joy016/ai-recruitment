"use client";

import { useRef, useState } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { Check } from "@mui/icons-material";
import {
  ROLE_COLOR_PRESETS,
  getReadableTextColor,
  isValidHexColor,
  normalizeHexColor,
} from "@/lib/utils/roleColor";

const SWATCH_SIZE = 28;
const RING_COLOR = "#1f80b6";

type RoleColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
};

export default function RoleColorPicker({
  value,
  onChange,
  disabled = false,
}: Readonly<RoleColorPickerProps>) {
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hexInput, setHexInput] = useState(value);
  const [hexError, setHexError] = useState("");
  // Mirrors `value` to detect external changes (a preset click, or the dialog
  // resetting on close/success) without an effect - see React's "adjusting
  // state when a prop changes" pattern.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setHexInput(value);
    setHexError("");
  }

  const presetIndex = ROLE_COLOR_PRESETS.findIndex(
    (preset) => preset === value,
  );

  const selectPreset = (index: number) => {
    const preset = ROLE_COLOR_PRESETS[index];
    onChange(preset);
    swatchRefs.current[index]?.focus();
  };

  const handleSwatchKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const count = ROLE_COLOR_PRESETS.length;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectPreset((index + 1) % count);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectPreset((index - 1 + count) % count);
    }
  };

  const handleHexInputChange = (raw: string) => {
    setHexInput(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setHexError("");
      return;
    }
    if (!isValidHexColor(trimmed)) {
      setHexError("Enter a hex color like #2E86C1.");
      return;
    }
    setHexError("");
    onChange(normalizeHexColor(trimmed));
  };

  const handleNativeColorChange = (raw: string) => {
    const hex = normalizeHexColor(raw);
    setHexInput(hex);
    setHexError("");
    onChange(hex);
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: "#264a66", mb: 0.8 }}
      >
        Chip Color
      </Typography>

      <Stack
        direction="row"
        role="radiogroup"
        aria-label="Chip color"
        sx={{ flexWrap: "wrap", gap: 1 }}
      >
        {ROLE_COLOR_PRESETS.map((preset, index) => {
          const selected = preset === value;
          return (
            <Box
              key={preset}
              component="button"
              type="button"
              ref={(node: HTMLButtonElement | null) => {
                swatchRefs.current[index] = node;
              }}
              role="radio"
              aria-checked={selected}
              aria-label={preset}
              title={preset}
              tabIndex={
                selected || (presetIndex === -1 && index === 0) ? 0 : -1
              }
              disabled={disabled}
              onClick={() => selectPreset(index)}
              onKeyDown={(event) => handleSwatchKeyDown(event, index)}
              sx={{
                width: SWATCH_SIZE,
                height: SWATCH_SIZE,
                borderRadius: "50%",
                border: "none",
                p: 0,
                cursor: disabled ? "default" : "pointer",
                bgcolor: preset,
                display: "grid",
                placeItems: "center",
                boxShadow: selected
                  ? `0 0 0 2px #fff, 0 0 0 4px ${RING_COLOR}`
                  : "none",
                "&:focus-visible": {
                  outline: `2px solid ${RING_COLOR}`,
                  outlineOffset: 2,
                },
              }}
            >
              {selected && (
                <Check
                  fontSize="small"
                  sx={{ color: getReadableTextColor(preset), fontSize: 16 }}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", mt: 3 }}>
        <input
          type="color"
          aria-label="Custom chip color"
          disabled={disabled}
          value={(isValidHexColor(hexInput) ? hexInput : value).toLowerCase()}
          onChange={(event) => handleNativeColorChange(event.target.value)}
          style={{
            width: SWATCH_SIZE,
            height: SWATCH_SIZE,
            padding: 0,
            border: "1px solid #d7e8f5",
            borderRadius: 4,
            cursor: disabled ? "default" : "pointer",
            background: "none",
          }}
        />
        <TextField
          size="small"
          label="Custom hex"
          value={hexInput}
          onChange={(event) => handleHexInputChange(event.target.value)}
          error={!!hexError}
          helperText={hexError || "#RRGGBB"}
          disabled={disabled}
          sx={{ maxWidth: 180 }}
          slotProps={{ htmlInput: { maxLength: 7 } }}
        />
      </Stack>
    </Box>
  );
}
