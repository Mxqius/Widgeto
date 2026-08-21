import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EyeOff, Lock } from "lucide-react";
import type { DockZone, WidgetInstance, WidgetKind } from "@/lib/types";
import { DOCK_ZONES, alignSnap, dockPosition, resolveDock, snapToGrid, type Guide } from "@/lib/layout";
import { useApp } from "@/store/useApp";
import { byKind, sizeOf } from "@/widgets/registry";
import { markMoved, moveWidgetWindow } from "@/lib/desktop";
import { clamp, cn } from "@/lib/utils";

/**
 * A live, scaled map of one monitor's work area. Dragging a card here moves the
 * real widget window on the desktop, with the same docking and snapping rules.
 */
export default function DesktopMap({ display }: { display: number }) {
  const allWidgets = useApp((s) => s.widgets);
  const widgets = useMemo(
    () => allWidgets.filter((w) => w.display === display),
    [allWidgets, display],
  );
  const settings = useApp((s) => s.settings);
  const area = useApp((s) => s.areas[display] ?? s.areas[0]);
  const move = useApp((s) => s.move);
  const focus = useApp((s) => s.focus);
  const setOpen = useApp((s) => s.setOpen);

  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [dragId, setDragId] = useState<WidgetKind | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dock, setDock] = useState<DockZone | null>(null);
  const drag = useRef({ dx: 0, dy: 0, x: 0, y: 0, dock: null as DockZone | null });

  useEffect(() => {
    const el = ref.current;
    if (!el || !area) return;
    const measure = () => setScale(el.clientWidth / area.w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [area]);

  const onDown = useCallback(
    (e: React.PointerEvent, w: WidgetInstance) => {
      if (w.locked || settings.lockAll) return;
      const host = ref.current;
      if (!host) return;
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const r = host.getBoundingClientRect();
      drag.current.dx = (e.clientX - r.left) / scale - w.x;
      drag.current.dy = (e.clientY - r.top) / scale - w.y;
      drag.current.x = w.x;
      drag.current.y = w.y;
      focus(w.kind);
      setDragId(w.kind);
    },
    [scale, settings.lockAll, focus],
  );

  const onMove = useCallback(
    (e: React.PointerEvent, w: WidgetInstance) => {
      if (dragId !== w.kind || !area) return;
      const host = ref.current;
      if (!host) return;
      const r = host.getBoundingClientRect();
      const [ww, wh] = sizeOf(w.kind, w.size);

      let nx = clamp((e.clientX - r.left) / scale - drag.current.dx, -ww * 0.4, area.w - ww * 0.6);
      let ny = clamp((e.clientY - r.top) / scale - drag.current.dy, -wh * 0.25, area.h - wh * 0.4);

      const rect = { x: nx, y: ny, w: ww, h: wh };
      let zone: DockZone | null = null;
      let g: Guide[] = [];
      let snapped = false;

      if (settings.autoDock) {
        const d = resolveDock(rect, area, settings.margin, settings.dockThreshold);
        if (d) {
          zone = d.zone;
          nx = d.x;
          ny = d.y;
          snapped = true;
        }
      }
      if (!zone && settings.alignGuides) {
        const others = widgets
          .filter((o) => o.kind !== w.kind && o.open)
          .map((o) => {
            const [ow, oh] = sizeOf(o.kind, o.size);
            return { x: o.x, y: o.y, w: ow, h: oh };
          });
        const s = alignSnap(rect, others, area, 10);
        nx = s.x;
        ny = s.y;
        g = s.guides;
        snapped = s.snappedX || s.snappedY;
      }
      if (!zone && !snapped && settings.snapToGrid) {
        nx = snapToGrid(nx, settings.gridSize);
        ny = snapToGrid(ny, settings.gridSize);
      }

      drag.current.x = nx;
      drag.current.y = ny;
      drag.current.dock = zone;
      setGuides(g);
      setDock(zone);
      move(w.kind, nx, ny, zone);
      if (w.open) {
        markMoved(w.kind, nx, ny);
        void moveWidgetWindow(w.kind, nx + area.x, ny + area.y);
      }
    },
    [dragId, area, scale, settings, widgets, move],
  );

  const onUp = useCallback(
    (w: WidgetInstance) => {
      if (dragId !== w.kind) return;
      setDragId(null);
      setGuides([]);
      setDock(null);
      if (area) {
        markMoved(w.kind, drag.current.x, drag.current.y);
        void moveWidgetWindow(w.kind, drag.current.x + area.x, drag.current.y + area.y);
      }
    },
    [dragId, area],
  );

  if (!area) return null;

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-white/[0.07]",
          settings.showGrid && "grid-bg",
        )}
        style={{
          aspectRatio: `${area.w} / ${area.h}`,
          background:
            "radial-gradient(900px 500px at 15% 0%, #1b1a44 0%, transparent 60%), radial-gradient(700px 460px at 85% 10%, #0f3b47 0%, transparent 55%), #08090a",
        }}
      >
        {/* dock targets */}
        <AnimatePresence>
          {dragId && settings.autoDock && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0"
            >
              {DOCK_ZONES.map((z) => {
                const s = 88;
                const p = dockPosition(z, { x: 0, y: 0, w: s, h: s }, area, settings.margin / 2);
                const active = dock === z;
                return (
                  <motion.div
                    key={z}
                    animate={{ scale: active ? 1 : 0.8, opacity: active ? 1 : 0.3 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute rounded-lg border border-dashed"
                    style={{
                      left: p.x * scale,
                      top: p.y * scale,
                      width: s * scale,
                      height: s * scale,
                      borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.16)",
                      background: active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
                    }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* alignment guides */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {guides.map((g, i) => (
            <line
              key={i}
              x1={(g.axis === "x" ? g.at : g.from) * scale}
              y1={(g.axis === "x" ? g.from : g.at) * scale}
              x2={(g.axis === "x" ? g.at : g.to) * scale}
              y2={(g.axis === "x" ? g.to : g.at) * scale}
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          ))}
        </svg>

        {widgets.map((w) => {
          const def = byKind(w.kind);
          const Icon = def.icon;
          const [ww, wh] = sizeOf(w.kind, w.size);
          const active = dragId === w.kind;
          const locked = w.locked || settings.lockAll;
          return (
            <motion.div
              key={w.kind}
              onPointerDown={(e) => onDown(e, w)}
              onPointerMove={(e) => onMove(e, w)}
              onPointerUp={() => onUp(w)}
              onPointerCancel={() => onUp(w)}
              onDoubleClick={() => setOpen(w.kind, !w.open)}
              animate={{
                left: w.x * scale,
                top: w.y * scale,
                width: ww * scale,
                height: wh * scale,
                opacity: w.open ? 1 : 0.32,
                scale: active ? 1.04 : 1,
              }}
              transition={
                active
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 34 }
              }
              className={cn(
                "absolute flex flex-col items-center justify-center gap-1 overflow-hidden",
                locked ? "cursor-default" : active ? "cursor-grabbing" : "cursor-grab",
              )}
              style={{
                zIndex: active ? 50 : w.z,
                borderRadius: def.shape === "circle" ? "50%" : Math.max(4, 30 * scale),
                background: def.theme === "dark" ? "#0a0a0b" : "#fbfbfa",
                color: def.theme === "dark" ? "#fff" : "#0a0a0b",
                outline: active ? `1.5px solid ${def.accent}` : "1px solid rgba(255,255,255,0.09)",
                outlineOffset: active ? 1 : 0,
                boxShadow: active
                  ? `0 8px 22px -6px ${def.accent}`
                  : "0 3px 10px -6px rgba(0,0,0,0.9)",
              }}
              title={`${def.name} · ${w.size.toUpperCase()}${w.open ? "" : " · hidden"}`}
            >
              <Icon size={Math.max(10, Math.min(20, ww * scale * 0.22))} style={{ color: def.accent }} />
              {ww * scale > 78 && (
                <span className="max-w-full truncate px-1 text-[9px] font-medium text-ink-200">
                  {def.name}
                </span>
              )}
              {!w.open && (
                <EyeOff size={9} className="absolute top-1 right-1 text-ink-500" />
              )}
              {locked && w.open && (
                <Lock size={9} className="absolute top-1 right-1 text-ink-500" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
        <span>
          {area.name} · {area.w}×{area.h} work area
          {area.scale !== 1 && ` · ${Math.round(area.scale * 100)}% scaling`}
        </span>
        <span>drag to place · double-click to show/hide</span>
      </div>
    </div>
  );
}
