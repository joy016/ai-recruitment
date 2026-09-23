import { Switch } from "@mui/material";
import SettingRow from "./SettingRow";

type ToggleSettingProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}: Readonly<ToggleSettingProps>) {
  return (
    <SettingRow
      label={title}
      description={description}
      control={
        <Switch
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          inputProps={{ "aria-label": title }}
        />
      }
    />
  );
}
