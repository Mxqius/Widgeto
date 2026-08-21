import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownUp, CircleDashed, Eye, EyeOff, Grid2x2, Grid3x3, Layers, LayoutGrid,
  Lock, LockOpen, Magnet, Monitor, Pin, Plus, Settings2,
} from "lucide-react";
import DesktopMap from "@/components/DesktopMap";
import { Picker, Segmented, Tip } from "@/components/ui";
import { useApp } from "@/store/useApp";
import { WIDGETS, byKind } from "@/widgets/registry";
import type { ArrangeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Manager({
  onOpenLibrary,
  onOpenSettings,
}: {
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
}) {
  const widgets = useApp((s) => s.widgets);
  const settings = useApp((s) => s.settings);
  const areas = useApp((s) => s.areas);
  const update = useApp((s) => s.update);
  const autoArrangeNow = useApp((s) => s.autoArrangeNow);
  const redock = useApp((s) => s.redock);
  const setOpen = useApp((s) => s.setOpen);
  const cycleSize = useApp((s) => s.cycleSize);
  const toggleLock = useApp((s) => s.toggleLock);
  const setDisplay = useApp((s) => s.setDisplay);
  const closeAll = useApp((s) => s.closeAll);
  const openAll = useApp((s) => s.openAll);

  const [display, setDisplayTab] = useState(0);
  const live = widgets.filter((w) => w.open).length;

  const arrangeOptions: { value: ArrangeMode; label: React.ReactNode; title: string }[] = [
    { value: "grid", label: <Grid3x3 size={13} />, title: "Grid" },
    { value: "columns", label: <Grid2x2 size={13} />, title: "Balanced columns" },
    { value: "cascade", label: <Layers size={13} />, title: "Cascade" },
    { value: "ring", label: <CircleDashed size={13} />, title: "Ring" },
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* ------------------------------------------------- desktop preview */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">Desktop</h2>
          <span className="chip">
            {live} of {widgets.length} shown
          </span>
          <div className="flex-1" />

          {areas.length > 1 && (
            <Segmented
              layoutId="display"
              value={String(display)}
              onChange={(v) => setDisplayTab(Number(v))}
              options={areas.map((a, i) => ({ value: String(i), label: a.name || `Display ${i + 1}` }))}
            />
          )}
        </div>

        <DesktopMap display={display} />

        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn btn-primary px-3" onClick={() => autoArrangeNow()}>
            <ArrowDownUp size={13} /> Auto-arrange
          </button>
          <Segmented
            layoutId="arrange"
            value={settings.arrangeMode}
            onChange={(v) => {
              update({ arrangeMode: v });
              autoArrangeNow(v);
            }}
            options={arrangeOptions}
          />
          <Tip label="Dock every widget to a zone">
            <button className="btn" onClick={redock}>
              <Magnet size={13} /> Dock all
            </button>
          </Tip>
          <div className="mx-1 h-5 w-px bg-white/[0.07]" />
          <Tip label={settings.autoDock ? "Auto-dock on" : "Auto-dock off"}>
            <button className="btn" data-selected={settings.autoDock} onClick={() => update({ autoDock: !settings.autoDock })}>
              <Pin size={13} />
            </button>
          </Tip>
          <Tip label={settings.snapToGrid ? "Grid snap on" : "Grid snap off"}>
            <button className="btn" data-selected={settings.snapToGrid} onClick={() => update({ snapToGrid: !settings.snapToGrid })}>
              <LayoutGrid size={13} />
            </button>
          </Tip>
          <Tip label={settings.lockAll ? "Everything locked" : "Everything unlocked"}>
            <button className="btn" data-selected={settings.lockAll} onClick={() => update({ lockAll: !settings.lockAll })}>
              {settings.lockAll ? <Lock size={13} /> : <LockOpen size={13} />}
            </button>
          </Tip>
          <div className="flex-1" />
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
            <Monitor size={12} /> Layer
          </span>
          <Picker
            value={settings.layer}
            onChange={(v) => update({ layer: v })}
            options={[
              { value: "desktop", label: "On desktop" },
              { value: "normal", label: "Normal" },
              { value: "top", label: "Always on top" },
            ]}
          />
        </div>
      </div>

      {/* ------------------------------------------------------ side list */}
      <aside className="flex w-[330px] shrink-0 flex-col border-l border-white/[0.06]">
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2.5">
          <span className="label-xs flex-1">Widgets</span>
          <button className="btn h-7 px-2 text-[12px]" onClick={openAll}>
            <Eye size={12} /> All
          </button>
          <button className="btn h-7 px-2 text-[12px]" onClick={closeAll}>
            <EyeOff size={12} /> None
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {widgets.map((w) => {
            const def = byKind(w.kind);
            const Icon = def.icon;
            const locked = w.locked || settings.lockAll;
            return (
              <motion.div
                key={w.kind}
                layout
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
                className={cn(
                  "group mb-1 flex items-center gap-2.5 rounded-xl border border-white/[0.05] p-2 transition-colors",
                  w.open ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-transparent opacity-55 hover:opacity-90",
                )}
              >
                <div
                  className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.08]"
                  style={{
                    background: `color-mix(in srgb, ${def.accent} 16%, transparent)`,
                    color: def.accent,
                  }}
                >
                  <Icon size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-ink-100">{def.name}</div>
                  <div className="font-mono text-[10px] text-ink-500 tabular-nums">
                    {Math.round(w.x)}, {Math.round(w.y)} · {w.size.toUpperCase()}
                    {w.dock ? ` · ${w.dock}` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {areas.length > 1 && (
                    <button
                      title="Move to the next display"
                      className="btn size-7 px-0 text-[10px]"
                      onClick={() => setDisplay(w.kind, (w.display + 1) % areas.length)}
                    >
                      {w.display + 1}
                    </button>
                  )}
                  <button title="Cycle size" className="btn size-7 px-0 text-[10px]" onClick={() => cycleSize(w.kind)}>
                    {w.size.toUpperCase()}
                  </button>
                  <button
                    title={locked ? "Unlock" : "Lock"}
                    className="btn size-7 px-0"
                    data-selected={locked}
                    onClick={() => toggleLock(w.kind)}
                  >
                    {locked ? <Lock size={12} /> : <LockOpen size={12} />}
                  </button>
                  <button
                    title={w.open ? "Hide from desktop" : "Show on desktop"}
                    className="btn size-7 px-0"
                    data-selected={w.open}
                    onClick={() => setOpen(w.kind, !w.open)}
                  >
                    {w.open ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {widgets.length === 0 && (
            <div className="px-3 py-10 text-center text-[12.5px] text-ink-500">
              Nothing here yet — add a widget to put it on the desktop.
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-white/[0.06] p-2">
          <button className="btn btn-primary flex-1" onClick={onOpenLibrary}>
            <Plus size={14} /> Add widget
          </button>
          <button className="btn" onClick={onOpenSettings}>
            <Settings2 size={14} /> Settings
          </button>
        </div>
        <div className="px-3 pb-2 text-[10.5px] text-ink-600">
          {WIDGETS.length} widget types available · Ctrl+K
        </div>
      </aside>
    </div>
  );
}
