import { Picker, Range, SettingGroup, SettingRow, Toggle, cn } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { LowMemoryToggle } from "../controls/LowMemoryToggle";

const ACCENTS = [
  "#ff4dd8", "#ff5b2e", "#7c6cff", "#4aa8ff",
  "#3ddc84", "#f2b544", "#ff6b8b", "#e8e8e8",
];

export function AppearanceTab() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);

  return (
    <>
      <SettingGroup title="Accent">
        <SettingRow title="Accent colour" hint="Tints controls, guides and dock targets.">
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => update({ accent: c })}
                className={cn(
                  "size-5.5 rounded-full transition-transform hover:scale-110",
                  s.accent === c && "ring-2 ring-white/70 ring-offset-2 ring-offset-ink-850",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Surface">
        <SettingRow title="Tile opacity" hint="Below 100% the tiles turn to glass.">
          <div className="w-47.5">
            <Range
              min={0.3}
              max={1}
              step={0.02}
              value={s.widgetAlpha}
              onChange={(v) => update({ widgetAlpha: v })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        </SettingRow>
        <SettingRow
          title="Background blur"
          hint={
            s.lowMemory
              ? "Off while Low-memory mode is on."
              : "Only applies when tiles are translucent."
          }
        >
          <div className="w-47.5">
            <Range
              min={0}
              max={48}
              value={s.blur}
              onChange={(v) => update({ blur: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
        <SettingRow title="Corner radius">
          <div className="w-47.5">
            <Range
              min={8}
              max={48}
              value={s.radius}
              onChange={(v) => update({ radius: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
        <SettingRow title="Wallpaper" hint="Preview backdrop used in windowed mode.">
          <Picker
            value={s.wallpaper}
            onChange={(v) => update({ wallpaper: v })}
            options={[
              { value: "aurora", label: "Aurora" },
              { value: "mesh", label: "Mesh" },
              { value: "void", label: "Void" },
              { value: "none", label: "Transparent" },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Performance">
        <SettingRow title="Show dot grid" hint="Subtle alignment grid on the desktop map.">
          <Toggle checked={s.showGrid} onChange={(v) => update({ showGrid: v })} />
        </SettingRow>
        <SettingRow
          title="Power saver"
          hint="Stretches every widget's refresh interval fourfold."
        >
          <Picker
            value={s.powerSaver}
            onChange={(v) => update({ powerSaver: v })}
            options={[
              { value: "onBattery", label: "On battery" },
              { value: "always", label: "Always" },
              { value: "off", label: "Off" },
            ]}
          />
        </SettingRow>
        <SettingRow
          title="Low-memory mode"
          hint="Drops the tile blur, stretches every poll further, and hands compositing back to the CPU — about a quarter less memory, for slightly heavier animation. Takes full effect after a restart."
        >
          <LowMemoryToggle />
        </SettingRow>
        <SettingRow title="Reduce motion" hint="Disable springs and micro-animations.">
          <Toggle checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </SettingRow>
      </SettingGroup>
    </>
  );
}
