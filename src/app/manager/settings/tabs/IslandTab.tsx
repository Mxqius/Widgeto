import { CalendarDays, Gauge, Music, RotateCcw, Sparkles, Timer } from "lucide-react";
import { Picker, Range, Segmented, SettingGroup, SettingRow, Toggle, cn } from "@/app/manager/ui";
import { useApp, DEFAULT_SETTINGS } from "@/app/manager/store";
import type { IslandAlign, IslandIdle, IslandStyle, IslandTab as Tab, Settings } from "@/shared/types/settings";
import { HotkeyField } from "../controls/HotkeyField";

const TABS: { id: Tab; label: string; icon: typeof Music }[] = [
  { id: "media", label: "Music", icon: Music },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "system", label: "System", icon: Gauge },
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "ask", label: "Ask AI", icon: Sparkles },
];

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
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const areas = useApp((st) => st.areas);
  const notch = s.islandStyle === "notch";

  // Ask has its own switch in the AI tab; this chip is the same switch
  const shown = (t: Tab) => (t === "ask" ? s.aiEnabled : !s.islandHiddenTabs.includes(t));
  const visible = TABS.filter((t) => shown(t.id));
  const toggleTab = (t: Tab) => {
    const on = shown(t);
    // keep at least one tab, or opening the island would show nothing
    if (on && visible.length <= 1) return;
    if (t === "ask") return update({ aiEnabled: !on });
    update({
      islandHiddenTabs: on ? [...s.islandHiddenTabs, t] : s.islandHiddenTabs.filter((x) => x !== t),
    });
  };

  const monitorOptions = [
    { value: MAIN, label: "Main display" },
    ...areas.map((a, i) => ({
      value: a.name,
      label: `Display ${i + 1}${i === 0 ? " (main)" : ""} · ${a.w}×${a.h}`,
    })),
  ];
  // a monitor that is unplugged right now still shows as chosen
  if (s.islandMonitor && !areas.some((a) => a.name === s.islandMonitor)) {
    monitorOptions.push({ value: s.islandMonitor, label: "Disconnected display" });
  }

  const reset = () =>
    update(Object.fromEntries(ISLAND_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])) as Partial<Settings>);

  return (
    <>
      <SettingGroup title="General">
        <SettingRow
          title="Show the island"
          hint="A live strip at the top of your screen: music, focus timer, system, today and Ask AI."
        >
          <Toggle checked={s.island} onChange={(v) => update({ island: v })} />
        </SettingRow>
        <SettingRow
          title="Live activities"
          hint="Pops out briefly for a new track, the charger, a finished timer or a captured note."
        >
          <Toggle checked={s.islandActivities} onChange={(v) => update({ islandActivities: v })} />
        </SettingRow>
        {s.islandActivities && (
          <SettingRow
            title="Copy notifications"
            hint="Pops out with a peek at what you just copied. Passwords copied from a password manager are never shown."
          >
            <Toggle checked={s.islandClipboard} onChange={(v) => update({ islandClipboard: v })} />
          </SettingRow>
        )}
        <SettingRow
          title="Hide in full screen"
          hint="Tucks the island away while a game, video or presentation is full screen."
        >
          <Toggle checked={s.islandHideFullscreen} onChange={(v) => update({ islandHideFullscreen: v })} />
        </SettingRow>
        <SettingRow
          title="Tuck away hotkey"
          hint="Folds the island into a slim handle on the top edge. Press again, click the handle or right-click it to bring it back."
        >
          <HotkeyField field="islandTuckHotkey" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Position">
        <SettingRow title="Display" hint="Which monitor the island lives on.">
          <Picker
            value={s.islandMonitor ?? MAIN}
            onChange={(v) => update({ islandMonitor: v === MAIN ? null : v })}
            options={monitorOptions}
          />
        </SettingRow>
        <SettingRow title="Side" hint="Where along the top edge it sits, and which way it grows when it opens.">
          <Segmented<IslandAlign>
            value={s.islandAlign}
            onChange={(v) => update({ islandAlign: v, islandOffsetX: 0 })}
            layoutId="island-align"
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Centre" },
              { value: "right", label: "Right" },
            ]}
          />
        </SettingRow>
        <SettingRow title="Nudge" hint="Fine-tune it sideways from that spot, say to clear a webcam or a tab strip.">
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
          title="Gap from the top"
          hint={notch ? "The notch always hangs from the edge; this applies to the pill." : "Space between the top of the screen and the pill."}
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

      <SettingGroup title="Size & look">
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
        <SettingRow title="Size" hint="Scales the whole island, text and all.">
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
        <SettingRow title="Roundness" hint="From softly squared corners to a full pill.">
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
        <SettingRow title="Opacity" hint="How solid the black is. Lower lets the desktop show through.">
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
        <SettingRow title="Notch corners" hint="How far the notch's top corners flare into the edge.">
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

      <SettingGroup title="Behaviour">
        <SettingRow title="Open on" hint="Hover opens it as the pointer rests on it; click keeps it shut until you click.">
          <Segmented<"hover" | "click">
            value={s.islandOpenOn}
            onChange={(v) => update({ islandOpenOn: v })}
            layoutId="island-open"
            options={[
              { value: "hover", label: "Hover" },
              { value: "click", label: "Click" },
            ]}
          />
        </SettingRow>
        <SettingRow title="Hover delay" hint="How long the pointer rests before it opens.">
          <div className={cn("w-47.5", s.islandOpenOn !== "hover" && "pointer-events-none opacity-40")}>
            <Range
              min={0}
              max={800}
              step={10}
              value={s.islandOpenDelay}
              onChange={(v) => update({ islandOpenDelay: v })}
              format={(v) => `${v}ms`}
            />
          </div>
        </SettingRow>
        <SettingRow title="Scroll for volume" hint="Scroll over the island to turn the volume up or down.">
          <Toggle checked={s.islandWheelVolume} onChange={(v) => update({ islandWheelVolume: v })} />
        </SettingRow>
        <SettingRow title="Opens on" hint="Automatic picks music while it plays, then a running timer, then Today.">
          <Picker
            value={s.islandDefaultTab}
            onChange={(v) => update({ islandDefaultTab: v })}
            options={[
              { value: "auto", label: "Automatic" },
              ...visible.map((t) => ({ value: t.id, label: t.label })),
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Tabs & content">
        <div className="px-4 py-3">
          <div className="text-[13px] font-medium text-ink-100">Tabs</div>
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
            Which panels the open island has. Ask AI is the same switch as in the Ask AI settings.
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
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <SettingRow title="Resting pill shows" hint="Beside the clock while nothing else is going on. Automatic switches to the battery when it is low or charging.">
          <Picker<IslandIdle>
            value={s.islandIdle}
            onChange={(v) => update({ islandIdle: v })}
            options={[
              { value: "auto", label: "Automatic" },
              { value: "weather", label: "Weather" },
              { value: "battery", label: "Battery" },
              { value: "date", label: "Date" },
              { value: "none", label: "Just the clock" },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Reset">
        <SettingRow title="Reset the island" hint="Puts position, size, look and behaviour back to how they started.">
          <button className="btn" onClick={reset}>
            <RotateCcw size={13} /> Reset island
          </button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
