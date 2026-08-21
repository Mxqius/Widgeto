import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Blocks, Info, Keyboard, Magnet, Palette, RotateCcw,
  MonitorCog,
} from "lucide-react";
import { useApp, DEFAULT_SETTINGS } from "@/store/useApp";
import { Group, Picker, Range, Row, Segmented, Toggle } from "@/components/ui";
import { WIDGETS } from "@/widgets/registry";
import type { ArrangeMode, WidgetKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { setAlwaysOnTop } from "@/lib/tauri";

const ACCENTS = [
  "#ff4dd8", "#ff5b2e", "#7c6cff", "#4aa8ff",
  "#3ddc84", "#f2b544", "#ff6b8b", "#e8e8e8",
];

const TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "layout", label: "Layout & docking", icon: Magnet },
  { id: "widgets", label: "Widgets", icon: Blocks },
  { id: "window", label: "Desktop & window", icon: MonitorCog },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Settings({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<TabId>("appearance");
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const widgets = useApp((st) => st.widgets);
  const toggle = useApp((st) => st.toggle);
  const openAll = useApp((st) => st.openAll);
  const reset = useApp((st) => st.reset);
  const closeAll = useApp((st) => st.closeAll);
  const autoArrangeNow = useApp((st) => st.autoArrangeNow);

  const isOn = (k: WidgetKind) => widgets.find((w) => w.kind === k)?.open ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full w-full overflow-hidden bg-ink-950/92 backdrop-blur-2xl"
    >
      {/* ---------------------------------------------------------- sidebar */}
      <aside className="flex w-[218px] shrink-0 flex-col border-r border-white/6 p-3">
        <button onClick={onBack} className="btn mb-4 justify-start gap-2 px-2">
          <ArrowLeft size={14} /> Back to board
        </button>

        <nav className="flex flex-col gap-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                  active ? "text-white" : "text-ink-400 hover:bg-white/4 hover:text-ink-200",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-tab"
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    className="absolute inset-0 rounded-lg bg-white/7"
                  />
                )}
                <Icon size={14} className="relative z-10 shrink-0" />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />
        <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
          <div className="text-[12px] font-medium text-ink-200">Widgeto</div>
          <div className="mt-0.5 text-[11px] text-ink-500">v0.1.0 · Tauri 2 prototype</div>
        </div>
      </aside>

      {/* ----------------------------------------------------------- panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[620px] px-7 py-8">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
              <h2 className="mb-1 text-[19px] font-semibold tracking-tight text-white">
                {TABS.find((t) => t.id === tab)!.label}
              </h2>
              <p className="mb-7 text-[12.5px] text-ink-500">{BLURB[tab]}</p>

              {tab === "appearance" && (
                <>
                  <Group title="Accent">
                    <Row title="Accent colour" hint="Tints controls, guides and dock targets.">
                      <div className="flex items-center gap-1.5">
                        {ACCENTS.map((c) => (
                          <button
                            key={c}
                            onClick={() => update({ accent: c })}
                            className={cn(
                              "size-[22px] rounded-full transition-transform hover:scale-110",
                              s.accent === c && "ring-2 ring-white/70 ring-offset-2 ring-offset-ink-850",
                            )}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </Row>
                  </Group>

                  <Group title="Surface">
                    <Row title="Tile opacity" hint="Below 100% the tiles turn to glass.">
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
                    </Row>
                    <Row title="Background blur" hint="Only applies when tiles are translucent.">
                      <div className="w-[190px]">
                        <Range
                          min={0}
                          max={48}
                          value={s.blur}
                          onChange={(v) => update({ blur: v })}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    </Row>
                    <Row title="Corner radius">
                      <div className="w-[190px]">
                        <Range
                          min={8}
                          max={48}
                          value={s.radius}
                          onChange={(v) => update({ radius: v })}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    </Row>
                    <Row title="Wallpaper" hint="Preview backdrop used in windowed mode.">
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
                    </Row>
                  </Group>

                  <Group title="Motion">
                    <Row title="Show dot grid" hint="Subtle alignment grid on the desktop map.">
                      <Toggle checked={s.showGrid} onChange={(v) => update({ showGrid: v })} />
                    </Row>
                    <Row title="Reduce motion" hint="Disable springs and micro-animations.">
                      <Toggle checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
                    </Row>
                  </Group>
                </>
              )}

              {tab === "layout" && (
                <>
                  <Group title="Docking">
                    <Row title="Auto-dock to corners" hint="Widgets snap magnetically to the 9 dock zones.">
                      <Toggle checked={s.autoDock} onChange={(v) => update({ autoDock: v })} />
                    </Row>
                    <Row title="Dock pull distance" hint="How close a widget must get before it is captured.">
                      <div className="w-[190px]">
                        <Range
                          min={16}
                          max={140}
                          value={s.dockThreshold}
                          onChange={(v) => update({ dockThreshold: v })}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    </Row>
                    <Row title="Screen margin" hint="Gap kept between docked widgets and the edge.">
                      <div className="w-[190px]">
                        <Range
                          min={0}
                          max={80}
                          value={s.margin}
                          onChange={(v) => update({ margin: v })}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    </Row>
                  </Group>

                  <Group title="Snapping">
                    <Row title="Alignment guides" hint="Snap edges and centres to nearby widgets.">
                      <Toggle checked={s.alignGuides} onChange={(v) => update({ alignGuides: v })} />
                    </Row>
                    <Row title="Snap to grid">
                      <Toggle checked={s.snapToGrid} onChange={(v) => update({ snapToGrid: v })} />
                    </Row>
                    <Row title="Grid size">
                      <div className="w-[190px]">
                        <Range
                          min={2}
                          max={40}
                          step={2}
                          value={s.gridSize}
                          onChange={(v) => update({ gridSize: v })}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    </Row>
                    <Row title="Lock all widgets" hint="Freeze the whole board so nothing moves.">
                      <Toggle checked={s.lockAll} onChange={(v) => update({ lockAll: v })} />
                    </Row>
                  </Group>

                  <Group title="Auto ordering">
                    <Row title="Arrange mode">
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
                    </Row>
                    <Row title="Re-arrange automatically" hint="Re-pack the board whenever a widget is added or resized.">
                      <Toggle checked={s.autoArrange} onChange={(v) => update({ autoArrange: v })} />
                    </Row>
                    <Row title="Spacing between widgets">
                      <div className="w-47.5">
                        <Range
                          min={0}
                          max={48}
                          value={s.gap}
                          onChange={(v) => update({ gap: v })}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    </Row>
                    <Row title="Arrange now" hint="Apply the current mode to every visible widget.">
                      <button className="btn btn-primary px-3" onClick={() => autoArrangeNow()}>
                        Arrange desktop
                      </button>
                    </Row>
                  </Group>
                </>
              )}

              {tab === "widgets" && (
                <>
                  <Group title="Formats">
                    <Row title="24-hour clock">
                      <Toggle checked={s.clock24h} onChange={(v) => update({ clock24h: v })} />
                    </Row>
                    <Row title="Temperature unit">
                      <Segmented
                        layoutId="unit"
                        value={s.temperatureUnit}
                        onChange={(v) => update({ temperatureUnit: v })}
                        options={[
                          { value: "C", label: "°C" },
                          { value: "F", label: "°F" },
                        ]}
                      />
                    </Row>
                  </Group>

                  <Group title={`Widget types — ${widgets.length} placed`}>
                    {WIDGETS.map((w) => {
                      const Icon = w.icon;
                      const on = isOn(w.kind);
                      return (
                        <div key={w.kind} className="flex items-center gap-3 px-4 py-2.5">
                          <div
                            className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-white/8"
                            style={{
                              background: `color-mix(in srgb, ${w.accent} 15%, transparent)`,
                              color: w.accent,
                            }}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-ink-100">{w.name}</div>
                            <div className="truncate text-[11.5px] text-ink-500">{w.description}</div>
                          </div>
                          <Toggle checked={on} onChange={() => toggle(w.kind)} />
                        </div>
                      );
                    })}
                  </Group>
                </>
              )}

              {tab === "window" && (
                <>
                  <Group title="Widgets on the desktop">
                    <Row
                      title="Desktop layer"
                      hint="Where widget windows sit in the desktop z-order."
                    >
                      <Picker
                        value={s.layer}
                        onChange={(v) => update({ layer: v })}
                        options={[
                          { value: "desktop", label: "On desktop" },
                          { value: "normal", label: "Normal" },
                          { value: "top", label: "Always on top" },
                        ]}
                      />
                    </Row>
                    <Row title="Show every widget" hint="Spawn a desktop window for all of them.">
                      <button className="btn" onClick={openAll}>
                        Show all
                      </button>
                    </Row>
                    <Row title="Clear the desktop" hint="Hides every widget. Nothing is deleted.">
                      <button className="btn" onClick={closeAll}>
                        Hide all
                      </button>
                    </Row>
                  </Group>

                  <Group title="Manager window">
                    <Row title="Always on top" hint="Keep this manager above other windows.">
                      <Toggle
                        checked={s.managerAlwaysOnTop}
                        onChange={(v) => {
                          update({ managerAlwaysOnTop: v });
                          setAlwaysOnTop(v);
                        }}
                      />
                    </Row>
                  </Group>

                  <Group title="Danger zone">
                    <Row title="Reset everything" hint="Restore the default 12 widgets and default settings.">
                      <button className="btn text-red-300/90 hover:bg-red-500/15" onClick={reset}>
                        <RotateCcw size={13} /> Reset
                      </button>
                    </Row>
                    <Row title="Restore default preferences" hint="Keeps your widgets, resets the sliders.">
                      <button className="btn" onClick={() => update(DEFAULT_SETTINGS)}>
                        Restore defaults
                      </button>
                    </Row>
                  </Group>
                </>
              )}

              {tab === "shortcuts" && (
                <Group title="Keyboard">
                  {SHORTCUTS.map((k) => (
                    <div key={k.combo} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[13px] text-ink-200">{k.what}</span>
                      <div className="flex gap-1">
                        {k.combo.split("+").map((part) => (
                          <kbd key={part} className="chip font-mono">
                            {part}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </Group>
              )}

              {tab === "about" && (
                <div className="surface-flat rounded-2xl p-6">
                  <div
                    className="mb-4 grid size-11 place-items-center rounded-xl text-[15px] font-bold text-white"
                    style={{ background: "var(--accent)", boxShadow: "0 0 28px -6px var(--accent)" }}
                  >
                    W
                  </div>
                  <h3 className="text-[16px] font-semibold text-white">Widgeto 0.1.0</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
                    A desktop widget board prototype. Tauri 2 + React 19 + Vite 7, Base UI
                    primitives, Tailwind v4 and Motion for the springs and micro-interactions.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-[12px]">
                    {[
                      ["Shell", "Tauri 2 (Rust)"],
                      ["UI", "React 19 + Base UI"],
                      ["Styling", "Tailwind CSS v4"],
                      ["Motion", "Motion 13"],
                      ["State", "Zustand + persist"],
                      ["Bundler", "Vite 7"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
                        <div className="label-xs">{k}</div>
                        <div className="mt-0.5 text-ink-200">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

const BLURB: Record<TabId, string> = {
  appearance: "Tune the glass, the accent and the density of your widgets.",
  layout: "Control how widget windows snap, dock and re-order on your desktop.",
  widgets: "Add or remove widget instances and set their data formats.",
  window: "How widget windows and the manager behave on your desktop.",
  shortcuts: "Everything you can do without touching the mouse.",
  about: "What this prototype is built on.",
};

const SHORTCUTS = [
  { combo: "Ctrl+K", what: "Open the widget library" },
  { combo: "Ctrl+,", what: "Open settings" },
  { combo: "Ctrl+G", what: "Auto-arrange the desktop" },
  { combo: "Ctrl+D", what: "Dock everything to zones" },
  { combo: "Ctrl+L", what: "Lock / unlock every widget" },
  { combo: "Double-click", what: "Cycle a widget through S / M / L" },
  { combo: "Esc", what: "Close the current overlay" },
];
