import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownUp, Check, Layers, Lock, LockOpen, Magnet, Plus, Search, Settings2,
  SlidersHorizontal,
} from "lucide-react";
import WidgetSettings from "@/components/WidgetSettings";
import { Picker, Tip } from "@/components/ui";
import { useApp } from "@/store/useApp";
import { WIDGETS } from "@/widgets/registry";
import { HAS_CONFIG } from "@/widgets/config";
import type { WidgetKind, SizeKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES: SizeKey[] = ["sm", "md", "lg"];

/**
 * The first screen: a summary of what is on the desktop, then the catalogue.
 * Placement happens by dragging the widget itself, so there is no layout
 * canvas — this screen is about what exists and how each one is configured.
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
  const openAll = useApp((s) => s.openAll);
  const closeAll = useApp((s) => s.closeAll);

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<WidgetKind | null>(null);
  const [tab, setTab] = useState<"active" | "all">("active");

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------------------------------------------------------- hero */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="numeral text-[34px] leading-none text-white">{live}</span>
              <span className="text-[13px] font-semibold text-ink-500">
                / {WIDGETS.length} on your desktop
              </span>
            </div>
            <div className="mt-1 text-[11.5px] text-ink-500">
              Drag a widget on screen to move it. It snaps to corners and edges.
            </div>
          </div>
          <Tip label="App settings">
            <button className="btn size-8 px-0" onClick={onOpenSettings}>
              <Settings2 size={15} />
            </button>
          </Tip>
        </div>

        {/* quick actions */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <Action icon={<ArrowDownUp size={14} />} label="Arrange" onClick={() => autoArrangeNow()} />
          <Action icon={<Magnet size={14} />} label="Dock" onClick={redock} />
          <Action
            icon={settings.lockAll ? <Lock size={14} /> : <LockOpen size={14} />}
            label={settings.lockAll ? "Locked" : "Unlocked"}
            active={settings.lockAll}
            onClick={() => update({ lockAll: !settings.lockAll })}
          />
          <Action
            icon={<Layers size={14} />}
            label={live === WIDGETS.length ? "None" : "All"}
            onClick={() => (live === WIDGETS.length ? closeAll() : openAll())}
          />
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-lg border border-white/6 bg-white/[0.03] px-2.5">
            <Search size={13} className="text-ink-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search widgets…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink-100 outline-none placeholder:text-ink-600"
            />
          </div>
          {!q && (
            <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/[0.03] p-0.5">
              {(["active", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative h-7 rounded-md px-2.5 text-[11.5px] font-medium capitalize transition-colors",
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
      </div>

      {/* ---------------------------------------------------------- list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {rows.map((def) => {
          const w = state.get(def.kind);
          if (!w) return null;
          const Icon = def.icon;
          const locked = w.locked || settings.lockAll;
          const open = expanded === def.kind;

          return (
            <div
              key={def.kind}
              className={cn(
                "mb-1.5 overflow-hidden rounded-xl border transition-colors",
                w.open ? "border-white/8 bg-white/[0.035]" : "border-white/5 bg-transparent",
              )}
            >
              <div className="flex items-center gap-2.5 p-2">
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
                  <div className="truncate text-[12.5px] font-medium text-ink-100">{def.name}</div>
                  <div className="truncate text-[10.5px] text-ink-500">
                    {w.open
                      ? `${Math.round(w.x)}, ${Math.round(w.y)}${w.dock ? ` · ${w.dock}` : ""}`
                      : def.description}
                  </div>
                </div>

                {w.open && (
                  <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/[0.03] p-0.5">
                    {SIZES.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSize(def.kind, sz)}
                        title={`${sz.toUpperCase()} size`}
                        className={cn(
                          "h-6 w-6 rounded-md text-[10px] font-semibold uppercase transition-colors",
                          w.size === sz ? "bg-white/12 text-white" : "text-ink-500 hover:text-ink-300",
                        )}
                      >
                        {sz[0]}
                      </button>
                    ))}
                  </div>
                )}

                {w.open && (
                  <Tip label={locked ? "Unlock position" : "Lock position"}>
                    <button
                      className="btn size-7 px-0"
                      data-selected={locked}
                      onClick={() => toggleLock(def.kind)}
                    >
                      {locked ? <Lock size={12} /> : <LockOpen size={12} />}
                    </button>
                  </Tip>
                )}

                {HAS_CONFIG.has(def.kind) && (
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
          <div className="px-4 py-12 text-center">
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

      {/* --------------------------------------------------------- footer */}
      <div className="flex items-center justify-between gap-2 border-t border-white/6 px-3 py-2">
        <span className="text-[11px] text-ink-600">Widgets sit</span>
        <Picker
          value={settings.layer}
          onChange={(v) => update({ layer: v })}
          options={[
            { value: "desktop", label: "On the desktop" },
            { value: "normal", label: "Like a window" },
            { value: "top", label: "Above everything" },
          ]}
        />
      </div>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border py-2 transition-colors",
        active
          ? "border-transparent bg-[var(--accent-soft)] text-white"
          : "border-white/6 bg-white/[0.03] text-ink-300 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
