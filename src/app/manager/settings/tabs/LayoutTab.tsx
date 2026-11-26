import type { ArrangeMode } from "@/shared/types/geometry";
import { Range, Segmented, SettingGroup, SettingRow, Toggle } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";

export function LayoutTab() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const autoArrangeNow = useApp((st) => st.autoArrangeNow);

  return (
    <>
      <SettingGroup title="Docking">
        <SettingRow
          title="Auto-dock to corners"
          hint="Widgets snap magnetically to the 9 dock zones."
        >
          <Toggle checked={s.autoDock} onChange={(v) => update({ autoDock: v })} />
        </SettingRow>
        <SettingRow
          title="Dock pull distance"
          hint="How close a widget must get before it is captured."
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
        <SettingRow title="Screen margin" hint="Gap kept between docked widgets and the edge.">
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

      <SettingGroup title="Snapping">
        <SettingRow title="Alignment guides" hint="Snap edges and centres to nearby widgets.">
          <Toggle checked={s.alignGuides} onChange={(v) => update({ alignGuides: v })} />
        </SettingRow>
        <SettingRow title="Snap to grid">
          <Toggle checked={s.snapToGrid} onChange={(v) => update({ snapToGrid: v })} />
        </SettingRow>
        <SettingRow title="Grid size">
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
        <SettingRow title="Lock all widgets" hint="Freeze the whole board so nothing moves.">
          <Toggle checked={s.lockAll} onChange={(v) => update({ lockAll: v })} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Auto ordering">
        <SettingRow title="Arrange mode">
          <Segmented<ArrangeMode>
            layoutId="settings-arrange"
            value={s.arrangeMode}
            onChange={(v) => update({ arrangeMode: v })}
            options={[
              { value: "grid", label: "Grid" },
              { value: "columns", label: "Columns" },
              { value: "cascade", label: "Cascade" },
              { value: "ring", label: "Ring" },
            ]}
          />
        </SettingRow>
        <SettingRow
          title="Re-arrange automatically"
          hint="Re-pack the board whenever a widget is added or resized."
        >
          <Toggle checked={s.autoArrange} onChange={(v) => update({ autoArrange: v })} />
        </SettingRow>
        <SettingRow title="Spacing between widgets">
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
        <SettingRow title="Arrange now" hint="Apply the current mode to every visible widget.">
          <button className="btn btn-primary px-3" onClick={() => autoArrangeNow()}>
            Arrange desktop
          </button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
