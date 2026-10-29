import { Switch } from "@mui/material";
import SettingRow from "./SettingRow";

type ToggleSettingProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export default function ToggleSetting({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: Readonly<ToggleSettingProps>) {
  return (
    <SettingRow
      label={title}
      description={description}
      control={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          slotProps={{ input: { "aria-label": title } }}
        />
      }
    />
  );
}
