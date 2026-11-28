import type { ArrangeMode } from "@/shared/types/geometry";
import { Range, Segmented, SettingGroup, SettingRow, Toggle } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { useT } from "@/app/manager/i18n";

export function LayoutTab() {
  const t = useT();
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const autoArrangeNow = useApp((st) => st.autoArrangeNow);

  return (
    <>
      <SettingGroup title={t("Docking")}>
        <SettingRow
          title={t("Auto-dock to corners")}
          hint={t("Widgets snap magnetically to the 9 dock zones.")}
        >
          <Toggle checked={s.autoDock} onChange={(v) => update({ autoDock: v })} />
        </SettingRow>
        <SettingRow
          title={t("Dock pull distance")}
          hint={t("How close a widget must get before it is captured.")}
        >
          <div className="w-47.5">
            <Range
              min={16}
              max={140}
              value={s.dockThreshold}
              onChange={(v) => update({ dockThreshold: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Screen margin")} hint={t("Gap kept between docked widgets and the edge.")}>
          <div className="w-47.5">
            <Range
              min={0}
              max={80}
              value={s.margin}
              onChange={(v) => update({ margin: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Snapping")}>
        <SettingRow title={t("Alignment guides")} hint={t("Snap edges and centres to nearby widgets.")}>
          <Toggle checked={s.alignGuides} onChange={(v) => update({ alignGuides: v })} />
        </SettingRow>
        <SettingRow title={t("Snap to grid")}>
          <Toggle checked={s.snapToGrid} onChange={(v) => update({ snapToGrid: v })} />
        </SettingRow>
        <SettingRow title={t("Grid size")}>
          <div className="w-47.5">
            <Range
              min={2}
              max={40}
              step={2}
              value={s.gridSize}
              onChange={(v) => update({ gridSize: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Lock all widgets")} hint={t("Freeze the whole board so nothing moves.")}>
          <Toggle checked={s.lockAll} onChange={(v) => update({ lockAll: v })} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Auto ordering")}>
        <SettingRow title={t("Arrange mode")}>
          <Segmented<ArrangeMode>
            layoutId="settings-arrange"
            value={s.arrangeMode}
            onChange={(v) => update({ arrangeMode: v })}
            options={[
              { value: "grid", label: t("Grid") },
              { value: "columns", label: t("Columns") },
              { value: "cascade", label: t("Cascade") },
              { value: "ring", label: t("Ring") },
            ]}
          />
        </SettingRow>
        <SettingRow
          title={t("Re-arrange automatically")}
          hint={t("Re-pack the board whenever a widget is added or resized.")}
        >
          <Toggle checked={s.autoArrange} onChange={(v) => update({ autoArrange: v })} />
        </SettingRow>
        <SettingRow title={t("Spacing between widgets")}>
          <div className="w-47.5">
            <Range
              min={0}
              max={48}
              value={s.gap}
              onChange={(v) => update({ gap: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Arrange now")} hint={t("Apply the current mode to every visible widget.")}>
          <button className="btn btn-primary px-3" onClick={() => autoArrangeNow()}>
            {t("Arrange desktop")}
          </button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
