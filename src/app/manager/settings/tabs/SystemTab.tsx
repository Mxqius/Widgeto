import { RotateCcw } from "lucide-react";
import { Picker, SettingGroup, SettingRow, Toggle } from "@/app/manager/ui";
import { useApp, DEFAULT_SETTINGS } from "@/app/manager/store";
import { setAlwaysOnTop } from "@/app/manager/lib/window";
import { setStartInTray } from "@/app/manager/desktop/startup";
import { AutostartToggle } from "../controls/AutostartToggle";
import { HotkeyField } from "../controls/HotkeyField";
import { UpdateStatus } from "../controls/UpdateStatus";
import { useT } from "@/app/manager/i18n";

export function SystemTab() {
  const t = useT();
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const openAll = useApp((st) => st.openAll);
  const closeAll = useApp((st) => st.closeAll);
  const reset = useApp((st) => st.reset);

  return (
    <>
      <SettingGroup title={t("Widgets on the desktop")}>
        <SettingRow title={t("Desktop layer")} hint={t("Where your widgets sit relative to other windows.")}>
          <Picker
            value={s.layer}
            onChange={(v) => update({ layer: v })}
            options={[
              { value: "desktop", label: t("On desktop") },
              { value: "normal", label: t("Normal") },
              { value: "top", label: t("Always on top") },
            ]}
          />
        </SettingRow>
        <SettingRow title={t("Show every widget")} hint={t("Spawn a desktop window for all of them.")}>
          <button className="btn" onClick={openAll}>
            {t("Show all")}
          </button>
        </SettingRow>
        <SettingRow
          title={t("Clear the desktop")}
          hint={t("Closes every widget window, so a hidden widget costs no memory. Nothing is deleted.")}
        >
          <button className="btn" onClick={closeAll}>
            {t("Hide all")}
          </button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Startup")}>
        <SettingRow
          title={t("Launch at login")}
          hint={t("Registers Widgeto with Windows so your widgets are there on boot.")}
        >
          <AutostartToggle />
        </SettingRow>
        <SettingRow
          title={t("Start in the tray")}
          hint={t("Come up as a tray icon instead of opening this window.")}
        >
          <Toggle
            checked={s.startInTray}
            onChange={(v) => {
              update({ startInTray: v });
              void setStartInTray(v);
            }}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Updates")}>
        <SettingRow
          title={t("Check for updates automatically")}
          hint={t("Looks for a new version shortly after Widgeto starts.")}
        >
          <Toggle
            checked={s.autoUpdateEnabled}
            onChange={(v) => update({ autoUpdateEnabled: v })}
          />
        </SettingRow>
        <SettingRow title={t("Check for updates now")}>
          <UpdateStatus />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Quick capture")}>
        <SettingRow
          title={t("Capture hotkey")}
          hint={t("Opens a one-line bar that appends to your Notes widget.")}
        >
          <HotkeyField field="captureHotkey" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Manager window")}>
        <SettingRow title={t("Always on top")} hint={t("Keep this manager above other windows.")}>
          <Toggle
            checked={s.managerAlwaysOnTop}
            onChange={(v) => {
              update({ managerAlwaysOnTop: v });
              setAlwaysOnTop(v);
            }}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Danger zone")}>
        <SettingRow
          title={t("Reset everything")}
          hint={t("Restore the default widgets and default settings.")}
        >
          <button className="btn text-red-300/90 hover:bg-red-500/15" onClick={reset}>
            <RotateCcw size={13} /> {t("Reset")}
          </button>
        </SettingRow>
        <SettingRow
          title={t("Restore default preferences")}
          hint={t("Keeps your widgets, resets the sliders.")}
        >
          <button className="btn" onClick={() => update(DEFAULT_SETTINGS)}>
            {t("Restore defaults")}
          </button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
