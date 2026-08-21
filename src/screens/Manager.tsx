import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownUp, Lock, LockOpen, Magnet, Search, Settings2, SlidersHorizontal,
} from "lucide-react";
import WidgetSettings from "@/components/WidgetSettings";
import { Picker, Tip, Toggle } from "@/components/ui";
import { useApp } from "@/store/useApp";
import { WIDGETS } from "@/widgets/registry";
import { HAS_CONFIG } from "@/widgets/config";
import type { WidgetKind } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One list, one row per widget. Toggle it onto the desktop, open its own
 * settings inline. Placement happens by dragging the widget itself, so there
 * is no layout canvas here.
 */
export default function Manager({ onOpenSettings }: { onOpenSettings: () => void }) {
  const widgets = useApp((s) => s.widgets);
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.update);
  const setOpen = useApp((s) => s.setOpen);
  const cycleSize = useApp((s) => s.cycleSize);
  const toggleLock = useApp((s) => s.toggleLock);
  const autoArrangeNow = useApp((s) => s.autoArrangeNow);
  const redock = useApp((s) => s.redock);

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<WidgetKind | null>(null);

  const state = useMemo(() => new Map(widgets.map((w) => [w.kind, w])), [widgets]);
  const live = widgets.filter((w) => w.open).length;

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return WIDGETS;
    return WIDGETS.filter(
      (d) => d.name.toLowerCase().includes(t) || d.description.toLowerCase().includes(t),
    );
  }, [q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* search + count */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-lg border border-white/6 bg-white/[0.03] px-2.5">
          <Search size={13} className="text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search widgets…"
            className="flex-1 bg-transparent text-[12.5px] text-ink-100 outline-none placeholder:text-ink-600"
          />
        </div>
        <span className="chip">{live} on desktop</span>
      </div>

      {/* the list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {rows.map((def) => {
          const w = state.get(def.kind);
          if (!w) return null;
          const Icon = def.icon;
          const locked = w.locked || settings.lockAll;
          const open = expanded === def.kind;
          const configurable = HAS_CONFIG.has(def.kind);

          return (
            <div
              key={def.kind}
              className={cn(
                "mb-1 overflow-hidden rounded-xl border transition-colors",
                w.open ? "border-white/8 bg-white/[0.035]" : "border-white/5 bg-transparent",
              )}
            >
              <div className="flex items-center gap-2.5 p-2">
                <div
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-[9px] border border-white/8 transition-opacity",
                    !w.open && "opacity-45",
                  )}
                  style={{
                    background: `color-mix(in srgb, ${def.accent} ${w.open ? 20 : 10}%, transparent)`,
                    color: def.accent,
                  }}
                >
                  <Icon size={15} />
                </div>

                <div className={cn("min-w-0 flex-1", !w.open && "opacity-55")}>
                  <div className="truncate text-[12.5px] font-medium text-ink-100">{def.name}</div>
                  <div className="truncate text-[10.5px] text-ink-500">
                    {w.open
                      ? `${w.size.toUpperCase()} · ${Math.round(w.x)}, ${Math.round(w.y)}${w.dock ? ` · ${w.dock}` : ""}`
                      : def.description}
                  </div>
                </div>

                {w.open && (
                  <>
                    <Tip label="Cycle size">
                      <button
                        className="btn size-7 px-0 text-[10px]"
                        onClick={() => cycleSize(def.kind)}
                      >
                        {w.size.toUpperCase()}
                      </button>
                    </Tip>
                    <Tip label={locked ? "Unlock position" : "Lock position"}>
                      <button
                        className="btn size-7 px-0"
                        data-selected={locked}
                        onClick={() => toggleLock(def.kind)}
                      >
                        {locked ? <Lock size={12} /> : <LockOpen size={12} />}
                      </button>
                    </Tip>
                  </>
                )}

                {configurable && (
                  <Tip label="Widget settings">
                    <button
                      className="btn size-7 px-0"
                      data-selected={open}
                      onClick={() => setExpanded(open ? null : def.kind)}
                    >
                      <SlidersHorizontal size={12} />
                    </button>
                  </Tip>
                )}

                <Toggle checked={w.open} onChange={(v) => setOpen(def.kind, v)} />
              </div>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/6 px-3 pt-1 pb-2.5">
                      <WidgetSettings kind={def.kind} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="py-10 text-center text-[12.5px] text-ink-500">
            No widget matches “{q}”
          </div>
        )}
      </div>

      {/* compact global actions */}
      <div className="flex items-center gap-1.5 border-t border-white/6 px-3 py-2">
        <Tip label="Tidy every visible widget into a grid">
          <button className="btn" onClick={() => autoArrangeNow()}>
            <ArrowDownUp size={13} /> Arrange
          </button>
        </Tip>
        <Tip label="Dock each widget to a screen zone">
          <button className="btn" onClick={redock}>
            <Magnet size={13} /> Dock
          </button>
        </Tip>
        <Tip label={settings.lockAll ? "Everything locked" : "Everything unlocked"}>
          <button
            className="btn"
            data-selected={settings.lockAll}
            onClick={() => update({ lockAll: !settings.lockAll })}
          >
            {settings.lockAll ? <Lock size={13} /> : <LockOpen size={13} />}
          </button>
        </Tip>

        <div className="flex-1" />

        <Picker
          value={settings.layer}
          onChange={(v) => update({ layer: v })}
          options={[
            { value: "desktop", label: "On desktop" },
            { value: "normal", label: "Normal" },
            { value: "top", label: "Always on top" },
          ]}
        />
        <Tip label="App settings">
          <button className="btn" onClick={onOpenSettings}>
            <Settings2 size={14} />
          </button>
        </Tip>
      </div>
    </div>
  );
}
