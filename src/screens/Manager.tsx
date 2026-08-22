import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownUp, Check, Layers, Lock, LockOpen, Magnet, Monitor, Plus, Search,
  Settings2, SlidersHorizontal, X,
} from "lucide-react";
import WidgetSettings from "@/components/WidgetSettings";
import ProfileBar from "@/components/ProfileBar";
import { Picker, Tip } from "@/components/ui";
import { useApp } from "@/store/useApp";
import { WIDGETS } from "@/widgets/registry";
import type { WidgetKind, SizeKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES: SizeKey[] = ["sm", "md", "lg"];

/**
 * The first screen. A summary strip across the top, then the catalogue as a
 * responsive grid of cards — one column in a narrow window, up to four in a
 * wide one. Placement happens by dragging the widget itself, so there is no
 * layout canvas; this screen is about what exists and how it is configured.
 */
export default function Manager({ onOpenSettings }: { onOpenSettings: () => void }) {
  const widgets = useApp((s) => s.widgets);
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.update);
  const setOpen = useApp((s) => s.setOpen);
  const setSize = useApp((s) => s.setSize);
  const toggleLock = useApp((s) => s.toggleLock);
  const autoArrangeNow = useApp((s) => s.autoArrangeNow);
  const redock = useApp((s) => s.redock);
  const setDisplay = useApp((s) => s.setDisplay);
  const areas = useApp((s) => s.areas);
  const openAll = useApp((s) => s.openAll);
  const closeAll = useApp((s) => s.closeAll);

  const [q, setQ] = useState("");
  const [tuning, setTuning] = useState<WidgetKind | null>(null);
  const [tab, setTab] = useState<"active" | "all">("all");

  const state = useMemo(() => new Map(widgets.map((w) => [w.kind, w])), [widgets]);
  const live = widgets.filter((w) => w.open).length;

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = WIDGETS;
    if (t) {
      list = list.filter(
        (d) => d.name.toLowerCase().includes(t) || d.description.toLowerCase().includes(t),
      );
    } else if (tab === "active") {
      list = list.filter((d) => state.get(d.kind)?.open);
    }
    return list;
  }, [q, tab, state]);

  const tuned = tuning ? WIDGETS.find((d) => d.kind === tuning) : null;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ------------------------------------------------------- summary */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-6 pt-5 pb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="numeral text-[40px] leading-none text-white">{live}</span>
              <span className="text-[13px] font-semibold text-ink-500">
                of {WIDGETS.length} on your desktop
              </span>
            </div>
            <div className="mt-1.5 text-[12px] text-ink-500">
              Drag a widget on screen to move it — it snaps to corners, edges and its neighbours.
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
            <button className="btn" onClick={() => autoArrangeNow()}>
              <ArrowDownUp size={13} /> Arrange
            </button>
            <button className="btn" onClick={redock}>
              <Magnet size={13} /> Dock
            </button>
            <button
              className="btn"
              data-selected={settings.lockAll}
              onClick={() => update({ lockAll: !settings.lockAll })}
            >
              {settings.lockAll ? <Lock size={13} /> : <LockOpen size={13} />}
              {settings.lockAll ? "Locked" : "Lock"}
            </button>
            <button
              className="btn"
              onClick={() => (live === WIDGETS.length ? closeAll() : openAll())}
            >
              <Layers size={13} /> {live === WIDGETS.length ? "Hide all" : "Show all"}
            </button>
            <div className="mx-1 h-5 w-px bg-white/8" />
            <Picker
              value={settings.layer}
              onChange={(v) => update({ layer: v })}
              options={[
                { value: "desktop", label: "On the desktop" },
                { value: "normal", label: "Like a window" },
                { value: "top", label: "Above everything" },
              ]}
            />
            <Tip label="App settings">
              <button className="btn size-8 px-0" onClick={onOpenSettings}>
                <Settings2 size={15} />
              </button>
            </Tip>
          </div>
        </div>

        {/* ------------------------------------------------------ profiles */}
        <div className="border-y border-white/6 bg-white/1.5 px-6 py-2.5">
          <ProfileBar />
        </div>

        {/* ------------------------------------------------------- filters */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-3">
          <div className="flex h-8 w-full max-w-70 items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-2.5">
            <Search size={13} className="text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search widgets…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink-100 outline-none placeholder:text-ink-600"
            />
          </div>
          {!q && (
            <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
              {(["all", "active"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative h-7 rounded-md px-3 text-[11.5px] font-medium capitalize transition-colors",
                    tab === t ? "text-white" : "text-ink-500 hover:text-ink-300",
                  )}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="mgr-tab"
                      transition={{ type: "spring", stiffness: 520, damping: 38 }}
                      className="absolute inset-0 rounded-md bg-white/9"
                    />
                  )}
                  <span className="relative z-10">{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------- grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}
          >
            {rows.map((def) => {
              const w = state.get(def.kind);
              if (!w) return null;
              const Icon = def.icon;
              const locked = w.locked || settings.lockAll;

              return (
                <div
                  key={def.kind}
                  className={cn(
                    "group flex flex-col gap-2 rounded-xl border p-3 transition-colors",
                    w.open
                      ? "border-white/8 bg-white/[0.035]"
                      : "border-white/5 bg-transparent hover:border-white/8",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => setOpen(def.kind, !w.open)}
                      title={w.open ? "Remove from desktop" : "Add to desktop"}
                      className="relative grid size-9 shrink-0 place-items-center rounded-[10px] border border-white/8 transition-transform active:scale-95"
                      style={{
                        background: `color-mix(in srgb, ${def.accent} ${w.open ? 20 : 9}%, transparent)`,
                        color: def.accent,
                        opacity: w.open ? 1 : 0.5,
                      }}
                    >
                      <Icon size={16} />
                      <span
                        className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-ink-950"
                        style={{ background: w.open ? def.accent : "#3a3a40" }}
                      >
                        {w.open ? (
                          <Check size={8} strokeWidth={4} className="text-white" />
                        ) : (
                          <Plus size={8} strokeWidth={4} className="text-white" />
                        )}
                      </span>
                    </button>

                    <div className={cn("min-w-0 flex-1", !w.open && "opacity-55")}>
                      <div className="truncate text-[12.5px] font-medium text-ink-100">
                        {def.name}
                      </div>
                      <div className="truncate text-[10.5px] text-ink-500">
                        {w.open
                          ? `${Math.round(w.x)}, ${Math.round(w.y)}${w.dock ? ` · ${w.dock}` : ""}`
                          : def.description}
                      </div>
                    </div>

                    <Tip label="Widget settings">
                      <button
                        className="btn size-7 shrink-0 px-0"
                        data-selected={tuning === def.kind}
                        onClick={() => setTuning(tuning === def.kind ? null : def.kind)}
                      >
                        <SlidersHorizontal size={12} />
                      </button>
                    </Tip>
                  </div>

                  {w.open && (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
                        {SIZES.map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSize(def.kind, sz)}
                            title={`${sz.toUpperCase()} size`}
                            className={cn(
                              "h-6 w-7 rounded-md text-[10px] font-semibold uppercase transition-colors",
                              w.size === sz
                                ? "bg-white/12 text-white"
                                : "text-ink-500 hover:text-ink-300",
                            )}
                          >
                            {sz[0]}
                          </button>
                        ))}
                      </div>
                      {areas.length > 1 && (
                        <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
                          <Monitor size={11} className="ml-1 text-ink-500" />
                          {areas.map((a, i) => (
                            <button
                              key={i}
                              onClick={() => setDisplay(def.kind, i)}
                              title={`Move to ${a.name || `display ${i + 1}`}`}
                              className={cn(
                                "h-6 w-6 rounded-md text-[10px] font-semibold transition-colors",
                                w.display === i
                                  ? "bg-white/12 text-white"
                                  : "text-ink-500 hover:text-ink-300",
                              )}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex-1" />
                      <Tip label={locked ? "Unlock position" : "Lock position"}>
                        <button
                          className="btn size-7 px-0"
                          data-selected={locked}
                          onClick={() => toggleLock(def.kind)}
                        >
                          {locked ? <Lock size={12} /> : <LockOpen size={12} />}
                        </button>
                      </Tip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {rows.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="text-[13px] font-medium text-ink-300">
                {q ? `No widget matches “${q}”` : "Nothing on the desktop yet"}
              </div>
              {!q && (
                <button className="btn btn-primary mx-auto mt-3 px-3" onClick={() => setTab("all")}>
                  Browse all widgets
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/*
        Always mounted, collapsed to zero width when closed. Deliberately not
        animated: AnimatePresence would not reliably fire the enter animation
        here, and transitioning `width` both stalled and forces a layout pass
        every frame. The panel simply appears.
      */}
      <aside
        className="shrink-0 overflow-hidden border-l border-white/6 bg-white/1.5"
        style={{ width: tuned ? 320 : 0, borderLeftWidth: tuned ? 1 : 0 }}
        aria-hidden={!tuned}
      >
        {tuned && (
          <div className="flex h-full w-[320px] flex-col">
            <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
              <div
                className="grid size-7 shrink-0 place-items-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${tuned.accent} 18%, transparent)`,
                  color: tuned.accent,
                }}
              >
                <tuned.icon size={14} />
              </div>
              <span className="flex-1 truncate text-[13px] font-semibold text-ink-100">
                {tuned.name}
              </span>
              <button className="btn size-7 px-0" onClick={() => setTuning(null)} title="Close">
                <X size={13} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              <WidgetSettings kind={tuned.kind} />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
