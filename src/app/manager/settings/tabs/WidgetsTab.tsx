import { Segmented, SettingGroup, SettingRow, Toggle } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { DataStatus } from "../controls/DataStatus";

export function WidgetsTab() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);

  return (
    <>
      <SettingGroup title="Data">
        <SettingRow
          title="Weather and Markets"
          hint="Updates automatically in the background — nothing to install or run."
        >
          <DataStatus />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Formats">
        <SettingRow title="24-hour clock">
          <Toggle checked={s.clock24h} onChange={(v) => update({ clock24h: v })} />
        </SettingRow>
        <SettingRow title="Temperature unit">
          <Segmented
            layoutId="unit"
            value={s.temperatureUnit}
            onChange={(v) => update({ temperatureUnit: v })}
            options={[
              { value: "C", label: "°C" },
              { value: "F", label: "°F" },
            ]}
          />
        </SettingRow>
      </SettingGroup>
    </>
  );
}
