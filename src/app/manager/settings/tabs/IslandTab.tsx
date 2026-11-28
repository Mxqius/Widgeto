import { CalendarDays, Gauge, Music, Radio, RotateCcw, Sparkles, Timer } from "lucide-react";
import { Picker, Range, Segmented, SettingGroup, SettingRow, Toggle, cn } from "@/app/manager/ui";
import { useApp, DEFAULT_SETTINGS } from "@/app/manager/store";
import type { IslandAlign, IslandIdle, IslandStyle, IslandTab as Tab, Settings } from "@/shared/types/settings";
import { HotkeyField } from "../controls/HotkeyField";
import { digits, useT } from "@/app/manager/i18n";

const TABS = [
  { id: "media", label: "Music", icon: Music },
  { id: "radio", label: "Radio", icon: Radio },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "system", label: "System", icon: Gauge },
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "ask", label: "Ask AI", icon: Sparkles },
] as const satisfies readonly { id: Tab; label: string; icon: typeof Music }[];

/** Every island setting, so "Reset island" can put just these back. */
const ISLAND_KEYS = [
  "islandStyle", "islandMonitor", "islandAlign", "islandOffsetX", "islandTop", "islandScale",
  "islandRoundness", "islandOpacity", "islandEarSize", "islandOpenOn", "islandOpenDelay",
  "islandWheelVolume", "islandDefaultTab", "islandHiddenTabs", "islandIdle",
] as const satisfies readonly (keyof Settings)[];

/** The picker's value for "whichever display is the main one". */
const MAIN = "@main";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const px = (v: number) => `${v > 0 ? "+" : ""}${v}px`;

export function IslandTab() {
  const t = useT();
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const areas = useApp((st) => st.areas);
  const notch = s.islandStyle === "notch";

  // Ask has its own switch in the AI tab; this chip is the same switch
  const shown = (id: Tab) => (id === "ask" ? s.aiEnabled : !s.islandHiddenTabs.includes(id));
  const visible = TABS.filter((x) => shown(x.id));
  const toggleTab = (id: Tab) => {
    const on = shown(id);
    // keep at least one tab, or opening the island would show nothing
    if (on && visible.length <= 1) return;
    if (id === "ask") return update({ aiEnabled: !on });
    update({
      islandHiddenTabs: on ? [...s.islandHiddenTabs, id] : s.islandHiddenTabs.filter((x) => x !== id),
    });
  };

  const monitorOptions = [
    { value: MAIN, label: t("Main display") },
    ...areas.map((a, i) => ({
      value: a.name,
      label: `${i === 0 ? t("Display {n} (main)", { n: i + 1 }) : t("Display {n}", { n: i + 1 })} · ${digits(`${a.w}×${a.h}`)}`,
    })),
  ];
  // a monitor that is unplugged right now still shows as chosen
  if (s.islandMonitor && !areas.some((a) => a.name === s.islandMonitor)) {
    monitorOptions.push({ value: s.islandMonitor, label: t("Disconnected display") });
  }

  const reset = () =>
    update(Object.fromEntries(ISLAND_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])) as Partial<Settings>);

  return (
    <>
      <SettingGroup title={t("General")}>
        <SettingRow
          title={t("Show the island")}
          hint={t("A live strip at the top of your screen: music, focus timer, system, today and Ask AI.")}
        >
          <Toggle checked={s.island} onChange={(v) => update({ island: v })} />
        </SettingRow>
        <SettingRow
          title={t("Live activities")}
          hint={t("Pops out briefly for a new track, the charger, a finished timer or a captured note.")}
        >
          <Toggle checked={s.islandActivities} onChange={(v) => update({ islandActivities: v })} />
        </SettingRow>
        {s.islandActivities && (
          <SettingRow
            title={t("Copy notifications")}
            hint={t("Pops out with a peek at what you just copied. Passwords copied from a password manager are never shown.")}
          >
            <Toggle checked={s.islandClipboard} onChange={(v) => update({ islandClipboard: v })} />
          </SettingRow>
        )}
        <SettingRow
          title={t("Hide in full screen")}
          hint={t("Tucks the island away while a game, video or presentation is full screen.")}
        >
          <Toggle checked={s.islandHideFullscreen} onChange={(v) => update({ islandHideFullscreen: v })} />
        </SettingRow>
        <SettingRow
          title={t("Tuck away hotkey")}
          hint={t("Folds the island into a slim handle on the top edge. Press again, click the handle or right-click it to bring it back.")}
        >
          <HotkeyField field="islandTuckHotkey" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Position")}>
        <SettingRow title={t("Display")} hint={t("Which monitor the island lives on.")}>
          <Picker
            value={s.islandMonitor ?? MAIN}
            onChange={(v) => update({ islandMonitor: v === MAIN ? null : v })}
            options={monitorOptions}
          />
        </SettingRow>
        <SettingRow title={t("Side")} hint={t("Where along the top edge it sits, and which way it grows when it opens.")}>
          {/* sides of the physical screen: left stays on the left in every language */}
          <div dir="ltr">
            <Segmented<IslandAlign>
              value={s.islandAlign}
              onChange={(v) => update({ islandAlign: v, islandOffsetX: 0 })}
              layoutId="island-align"
              options={[
                { value: "left", label: t("Left") },
                { value: "center", label: t("Centre") },
                { value: "right", label: t("Right") },
              ]}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Nudge")} hint={t("Fine-tune it sideways from that spot, say to clear a webcam or a tab strip.")}>
          <div className="w-47.5">
            <Range
              min={-400}
              max={400}
              step={4}
              value={s.islandOffsetX}
              onChange={(v) => update({ islandOffsetX: v })}
              format={px}
            />
          </div>
        </SettingRow>
        <SettingRow
          title={t("Gap from the top")}
          hint={notch ? t("The notch always hangs from the edge; this applies to the pill.") : t("Space between the top of the screen and the pill.")}
        >
          <div className={cn("w-47.5", notch && "pointer-events-none opacity-40")}>
            <Range
              min={0}
              max={40}
              value={s.islandTop}
              onChange={(v) => update({ islandTop: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Size & look")}>
        <SettingRow
          title={t("Shape")}
          hint={t("Pill floats just below the top edge. Notch hangs from it, with its corners flaring into the edge.")}
        >
          <Segmented<IslandStyle>
            value={s.islandStyle}
            onChange={(v) => update({ islandStyle: v })}
            layoutId="island-style"
            options={[
              { value: "pill", label: t("Pill") },
              { value: "notch", label: t("Notch") },
            ]}
          />
        </SettingRow>
        <SettingRow title={t("Size")} hint={t("Scales the whole island, text and all.")}>
          <div className="w-47.5">
            <Range
              min={0.8}
              max={1.25}
              step={0.05}
              value={s.islandScale}
              onChange={(v) => update({ islandScale: v })}
              format={pct}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Roundness")} hint={t("From softly squared corners to a full pill.")}>
          <div className="w-47.5">
            <Range
              min={0.3}
              max={1}
              step={0.05}
              value={s.islandRoundness}
              onChange={(v) => update({ islandRoundness: v })}
              format={pct}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Opacity")} hint={t("How solid the black is. Lower lets the desktop show through.")}>
          <div className="w-47.5">
            <Range
              min={0.5}
              max={1}
              step={0.05}
              value={s.islandOpacity}
              onChange={(v) => update({ islandOpacity: v })}
              format={pct}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Notch corners")} hint={t("How far the notch's top corners flare into the edge.")}>
          <div className={cn("w-47.5", !notch && "pointer-events-none opacity-40")}>
            <Range
              min={0.25}
              max={0.8}
              step={0.05}
              value={s.islandEarSize}
              onChange={(v) => update({ islandEarSize: v })}
              format={pct}
            />
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Behaviour")}>
        <SettingRow title={t("Open on")} hint={t("Hover opens it as the pointer rests on it; click keeps it shut until you click.")}>
          <Segmented<"hover" | "click">
            value={s.islandOpenOn}
            onChange={(v) => update({ islandOpenOn: v })}
            layoutId="island-open"
            options={[
              { value: "hover", label: t("Hover") },
              { value: "click", label: t("Click") },
            ]}
          />
        </SettingRow>
        <SettingRow title={t("Hover delay")} hint={t("How long the pointer rests before it opens.")}>
          <div className={cn("w-47.5", s.islandOpenOn !== "hover" && "pointer-events-none opacity-40")}>
            <Range
              min={0}
              max={800}
              step={10}
              value={s.islandOpenDelay}
              onChange={(v) => update({ islandOpenDelay: v })}
              format={(v) => t("{n}ms", { n: v })}
            />
          </div>
        </SettingRow>
        <SettingRow title={t("Scroll for volume")} hint={t("Scroll over the island to turn the volume up or down.")}>
          <Toggle checked={s.islandWheelVolume} onChange={(v) => update({ islandWheelVolume: v })} />
        </SettingRow>
        <SettingRow title={t("Opens on")} hint={t("Automatic picks music or the radio while it plays, then a running timer, then Today.")}>
          <Picker
            value={s.islandDefaultTab}
            onChange={(v) => update({ islandDefaultTab: v })}
            options={[
              { value: "auto", label: t("Automatic") },
              ...visible.map((x) => ({ value: x.id, label: t(x.label) })),
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Tabs & content")}>
        <div className="px-4 py-3">
          <div className="text-[13px] font-medium text-ink-100">{t("Tabs")}</div>
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
            {t("Which panels the open island has. Ask AI is the same switch as in the Ask AI settings.")}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {TABS.map(({ id, label, icon: I }) => {
              const on = shown(id);
              return (
                <button
                  key={id}
                  aria-pressed={on}
                  onClick={() => toggleTab(id)}
                  className={cn(
                    "flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
                    on
                      ? "border-white/12 bg-white/9 text-white"
                      : "border-white/6 bg-transparent text-ink-500 hover:text-ink-300",
                  )}
                >
                  <I size={13} style={on ? { color: "var(--accent)" } : undefined} />
                  {t(label)}
                </button>
              );
            })}
          </div>
        </div>
        <SettingRow title={t("Resting pill shows")} hint={t("Beside the clock while nothing else is going on. Automatic switches to the battery when it is low or charging.")}>
          <Picker<IslandIdle>
            value={s.islandIdle}
            onChange={(v) => update({ islandIdle: v })}
            options={[
              { value: "auto", label: t("Automatic") },
              { value: "weather", label: t("Weather") },
              { value: "battery", label: t("Battery") },
              { value: "date", label: t("Date") },
              { value: "none", label: t("Just the clock") },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("Reset")}>
        <SettingRow title={t("Reset the island")} hint={t("Puts position, size, look and behaviour back to how they started.")}>
          <button className="btn" onClick={reset}>
            <RotateCcw size={13} /> {t("Reset island")}
          </button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
