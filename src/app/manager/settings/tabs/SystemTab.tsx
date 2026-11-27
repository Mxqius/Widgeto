import { RotateCcw } from "lucide-react";
import { Picker, Segmented, SettingGroup, SettingRow, Toggle } from "@/app/manager/ui";
import { useApp, DEFAULT_SETTINGS } from "@/app/manager/store";
import type { IslandStyle } from "@/shared/types/settings";
import { setAlwaysOnTop } from "@/app/manager/lib/window";
import { setStartInTray } from "@/app/manager/desktop/startup";
import { AutostartToggle } from "../controls/AutostartToggle";
import { HotkeyField } from "../controls/HotkeyField";
import { UpdateStatus } from "../controls/UpdateStatus";

export function SystemTab() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const openAll = useApp((st) => st.openAll);
  const closeAll = useApp((st) => st.closeAll);
  const reset = useApp((st) => st.reset);

  return (
    <>
      <SettingGroup title="Widgets on the desktop">
        <SettingRow title="Desktop layer" hint="Where your widgets sit relative to other windows.">
          <Picker
            value={s.layer}
            onChange={(v) => update({ layer: v })}
            options={[
              { value: "desktop", label: "On desktop" },
              { value: "normal", label: "Normal" },
              { value: "top", label: "Always on top" },
            ]}
          />
        </SettingRow>
        <SettingRow title="Show every widget" hint="Spawn a desktop window for all of them.">
          <button className="btn" onClick={openAll}>
            Show all
          </button>
        </SettingRow>
        <SettingRow
          title="Clear the desktop"
          hint="Closes every widget window, so a hidden widget costs no memory. Nothing is deleted."
        >
          <button className="btn" onClick={closeAll}>
            Hide all
          </button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Dynamic Island">
        <SettingRow
          title="Show the island"
          hint="A live strip at the top of your main display: music, focus timer, system and today."
        >
          <Toggle checked={s.island} onChange={(v) => update({ island: v })} />
        </SettingRow>
        <SettingRow
          title="Shape"
          hint="Pill floats just below the top edge. Notch hangs from it, with its corners flaring into the edge."
        >
          <Segmented<IslandStyle>
            value={s.islandStyle}
            onChange={(v) => update({ islandStyle: v })}
            layoutId="island-style"
            options={[
              { value: "pill", label: "Pill" },
              { value: "notch", label: "Notch" },
            ]}
          />
        </SettingRow>
        <SettingRow
          title="Live activities"
          hint="Pops out briefly for a new track, the charger, a finished timer or a captured note."
        >
          <Toggle
            checked={s.islandActivities}
            onChange={(v) => update({ islandActivities: v })}
          />
        </SettingRow>
        <SettingRow
          title="Hide in full screen"
          hint="Tucks the island away while a game, video or presentation is full screen."
        >
          <Toggle
            checked={s.islandHideFullscreen}
            onChange={(v) => update({ islandHideFullscreen: v })}
          />
        </SettingRow>
        <SettingRow
          title="Tuck away hotkey"
          hint="Folds the island into a slim handle on the top edge, out of the way of tabs and title bars. Press again, click the handle or right-click it to bring it back."
        >
          <HotkeyField field="islandTuckHotkey" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Startup">
        <SettingRow
          title="Launch at login"
          hint="Registers Widgeto with Windows so your widgets are there on boot."
        >
          <AutostartToggle />
        </SettingRow>
        <SettingRow
          title="Start in the tray"
          hint="Come up as a tray icon instead of opening this window."
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

      <SettingGroup title="Updates">
        <SettingRow
          title="Check for updates automatically"
          hint="Looks for a new version shortly after Widgeto starts."
        >
          <Toggle
            checked={s.autoUpdateEnabled}
            onChange={(v) => update({ autoUpdateEnabled: v })}
          />
        </SettingRow>
        <SettingRow title="Check for updates now">
          <UpdateStatus />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Quick capture">
        <SettingRow
          title="Capture hotkey"
          hint="Opens a one-line bar that appends to your Notes widget."
        >
          <HotkeyField field="captureHotkey" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Manager window">
        <SettingRow title="Always on top" hint="Keep this manager above other windows.">
          <Toggle
            checked={s.managerAlwaysOnTop}
            onChange={(v) => {
              update({ managerAlwaysOnTop: v });
              setAlwaysOnTop(v);
            }}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Danger zone">
        <SettingRow
          title="Reset everything"
          hint="Restore the default widgets and default settings."
        >
          <button className="btn text-red-300/90 hover:bg-red-500/15" onClick={reset}>
            <RotateCcw size={13} /> Reset
          </button>
        </SettingRow>
        <SettingRow
          title="Restore default preferences"
          hint="Keeps your widgets, resets the sliders."
        >
          <button className="btn" onClick={() => update(DEFAULT_SETTINGS)}>
            Restore defaults
          </button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
