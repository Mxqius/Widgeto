import { Picker, Range, SettingGroup, SettingRow, Toggle, cn } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { ACCENTS } from "@/app/manager/ui/accents";
import { LowMemoryToggle } from "../controls/LowMemoryToggle";
import type { LangSetting } from "@/shared/i18n/locale";
import { useT } from "@/app/manager/i18n";

export function AppearanceTab() {
  const t = useT();
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);

  return (
    <>
      <SettingGroup title={t("Language")}>
        <SettingRow title={t("Language")} hint={t("System follows the Windows display language.")}>
          <Picker<LangSetting>
            value={s.language}
            onChange={(v) => update({ language: v })}
            options={[
              { value: "system", label: t("System") },
              // each language is named in itself, so it can be found from either
              { value: "en", label: "English" },
              { value: "fa", label: "فارسی" },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Accent")}>
        <SettingRow title={t("Accent colour")} hint={t("Tints controls, guides and dock targets.")}>
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

      <SettingGroup title={t("Surface")}>
        <SettingRow title={t("Tile opacity")} hint={t("Below 100% the tiles turn to glass.")}>
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
          title={t("Background blur")}
          hint={
            s.lowMemory
              ? t("Off while Low-memory mode is on.")
              : t("Only applies when tiles are translucent.")
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
        <SettingRow title={t("Corner radius")}>
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
        <SettingRow title={t("Wallpaper")} hint={t("Preview backdrop used in windowed mode.")}>
          <Picker
            value={s.wallpaper}
            onChange={(v) => update({ wallpaper: v })}
            options={[
              { value: "aurora", label: t("Aurora") },
              { value: "mesh", label: t("Mesh") },
              { value: "void", label: t("Void") },
              { value: "none", label: t("Transparent") },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Performance")}>
        <SettingRow title={t("Show dot grid")} hint={t("Subtle alignment grid on the desktop map.")}>
          <Toggle checked={s.showGrid} onChange={(v) => update({ showGrid: v })} />
        </SettingRow>
        <SettingRow
          title={t("Power saver")}
          hint={t("Stretches every widget's refresh interval fourfold.")}
        >
          <Picker
            value={s.powerSaver}
            onChange={(v) => update({ powerSaver: v })}
            options={[
              { value: "onBattery", label: t("On battery") },
              { value: "always", label: t("Always") },
              { value: "off", label: t("Off") },
            ]}
          />
        </SettingRow>
        <SettingRow
          title={t("Low-memory mode")}
          hint={t("Drops the tile blur, stretches every poll further, and hands compositing back to the CPU — about a quarter less memory, for slightly heavier animation. Takes full effect after a restart.")}
        >
          <LowMemoryToggle />
        </SettingRow>
        <SettingRow title={t("Reduce motion")} hint={t("Disable springs and micro-animations.")}>
          <Toggle checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </SettingRow>
      </SettingGroup>
    </>
  );
}
