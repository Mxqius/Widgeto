import { useCallback, useEffect, useRef, useState } from "react";
import type { DockZone, Rect } from "@/shared/types/geometry";
import type { WidgetKind } from "@/shared/types/widget";
import { areaAt } from "@/shared/desktop/area";
import { EVT, type ConfigPayload, type MovedPayload } from "@/shared/desktop/protocol";
import { alignSnap, resolveDock, snapToGrid } from "@/shared/layout/snap";
import { sizeOf } from "@/shared/widgets/kinds";
import { clamp, lerp } from "@/shared/lib/math";
import { approach, easeOutExpo } from "@/shared/lib/motion";
import { isTauri } from "@/shared/lib/env";

/** How quickly a snap offset catches up with the pointer, in ms. */
const SNAP_TAU = 55;
/** Landing animation once the widget is let go. */
const SETTLE_MS = 260;

/**
 * Dragging a frameless window around the desktop.
 *
 * The maths runs in absolute screen space rather than relative to the monitor
 * the drag started on: the pointer may well cross onto another display, and
 * clamping to the starting one is exactly what used to make a widget
 * impossible to move between screens. Whichever monitor the widget's middle
 * sits over owns it.
 *
 * Two positions are tracked, not one. `free` is where the pointer says the
 * widget is, and it follows the hand 1:1 — smoothing that would only read as
 * lag. `off` is the offset the dock, the guides or the grid want on top of it,
 * and that is what gets eased: engaging a snap slides the widget into place
 * over a few frames and leaving one slides it back out, so nothing on screen
 * jumps. Docking is magnetic on top of that — the pull ramps up as the widget
 * nears a zone instead of firing all at once at the threshold.
 *
 * A single animation loop owns `setPosition` and runs for as long as the drag
 * and its landing take. Driving the OS straight from pointermove would both
 * flood the IPC channel and tie the motion to the mouse's report rate.
 */
export function useWidgetDrag(
  kind: WidgetKind,
  cfg: ConfigPayload | null,
  onSettled: (m: Omit<MovedPayload, "kind">) => void,
) {
  const [dragging, setDragging] = useState(false);
  const [docking, setDocking] = useState<DockZone | null>(null);

  const drag = useRef({
    startX: 0,
    startY: 0,
    winX: 0,
    winY: 0,
    /** where the pointer puts us, before any snapping */
    freeX: 0,
    freeY: 0,
    /** snap offset: the one we are heading for, and the one we are drawing */
    offX: 0,
    offY: 0,
    curOffX: 0,
    curOffY: 0,
    dock: null as DockZone | null,
    display: 0,
    /** last position actually pushed to the OS */
    sentX: NaN,
    sentY: NaN,
    raf: 0,
    last: 0,
    /** release animation: from -> to over SETTLE_MS */
    settleFrom: null as { x: number; y: number } | null,
    settleTo: { x: 0, y: 0 },
    settleAt: 0,
    reduceMotion: false,
    areas: [] as ConfigPayload["areas"],
  });

  /** Push a position to the OS, skipping repeats of the same whole pixel. */
  const flush = useCallback(async (x: number, y: number) => {
    const d = drag.current;
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (rx === d.sentX && ry === d.sentY) return;
    d.sentX = rx;
    d.sentY = ry;
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const { LogicalPosition } = await import("@tauri-apps/api/dpi");
    const target = d.areas[d.display] ?? d.areas[0];
    if (!target) return;
    await getCurrentWindow().setPosition(new LogicalPosition(rx + target.x, ry + target.y));
  }, []);

  const stop = useCallback(() => {
    if (drag.current.raf) cancelAnimationFrame(drag.current.raf);
    drag.current.raf = 0;
  }, []);

  const report = useCallback(
    async (x: number, y: number, dock: DockZone | null, display: number) => {
      onSettled({ x, y, dock, display });
      if (!isTauri()) return;
      const { emit } = await import("@tauri-apps/api/event");
      await emit(EVT.moved, { kind, x, y, dock, display } satisfies MovedPayload);
    },
    [kind, onSettled],
  );

  /**
   * One loop for both phases: while the pointer is down it chases the snap
   * offset, and after release it runs the landing tween and reports where the
   * widget came to rest.
   */
  const tick = useCallback(
    (now: number) => {
      const d = drag.current;
      const dt = Math.min(64, now - (d.last || now));
      d.last = now;

      if (d.settleFrom) {
        const t = d.reduceMotion ? 1 : Math.min(1, (now - d.settleAt) / SETTLE_MS);
        const k = easeOutExpo(t);
        void flush(lerp(d.settleFrom.x, d.settleTo.x, k), lerp(d.settleFrom.y, d.settleTo.y, k));
        if (t >= 1) {
          d.raf = 0;
          d.settleFrom = null;
          d.freeX = d.settleTo.x;
          d.freeY = d.settleTo.y;
          d.offX = d.offY = d.curOffX = d.curOffY = 0;
          void report(d.settleTo.x, d.settleTo.y, d.dock, d.display);
          return;
        }
      } else {
        const tau = d.reduceMotion ? 0 : SNAP_TAU;
        d.curOffX = approach(d.curOffX, d.offX, dt, tau);
        d.curOffY = approach(d.curOffY, d.offY, dt, tau);
        void flush(d.freeX + d.curOffX, d.freeY + d.curOffY);
      }

      d.raf = requestAnimationFrame(tick);
    },
    [flush, report],
  );

  const start = useCallback(() => {
    if (drag.current.raf) return;
    drag.current.last = 0;
    drag.current.raf = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => stop, [stop]);

  const onPointerDown = useCallback(
    async (e: React.PointerEvent) => {
      if (!cfg) return;
      const { widget, settings: s } = cfg;
      if (widget.locked || s.lockAll) return;
      if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }

      const d = drag.current;
      // grabbed again mid-landing: report where that drag was headed, or the
      // manager would keep believing the widget is still where it started
      if (d.settleFrom) void report(d.settleTo.x, d.settleTo.y, d.dock, d.display);
      stop();
      d.startX = e.screenX;
      d.startY = e.screenY;
      // a click that never moves must not undock it; moving recomputes this
      d.dock = widget.dock ?? null;
      d.freeX = widget.x;
      d.freeY = widget.y;
      d.offX = d.offY = d.curOffX = d.curOffY = 0;
      d.settleFrom = null;
      d.settleTo = { x: widget.x, y: widget.y };
      d.sentX = d.sentY = NaN;
      d.display = widget.display;
      d.areas = cfg.areas;
      d.reduceMotion = s.reduceMotion;

      if (isTauri()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const [pos, scale] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
        d.winX = pos.x / scale;
        d.winY = pos.y / scale;
        // trust the window over the config: a landing we interrupted may not
        // have reached the manager yet
        const a = cfg.areas[widget.display] ?? cfg.area;
        d.freeX = d.winX - a.x;
        d.freeY = d.winY - a.y;
        d.settleTo = { x: d.freeX, y: d.freeY };
      }
      setDocking(null);
      setDragging(true);
      start();
    },
    [cfg, report, start, stop],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !cfg) return;
      const d = drag.current;
      const { widget, settings: s, areas, neighbours } = cfg;
      const [w, h] = sizeOf(widget.kind, widget.size);

      const absX = d.winX + (e.screenX - d.startX);
      const absY = d.winY + (e.screenY - d.startY);

      const di = areaAt(areas, absX + w / 2, absY + h / 2);
      const a = areas[di] ?? areas[0];

      const freeX = clamp(absX - a.x, -w * 0.4, a.w - w * 0.6);
      const freeY = clamp(absY - a.y, -h * 0.25, a.h - h * 0.4);

      const rect: Rect = { x: freeX, y: freeY, w, h };
      let zone: DockZone | null = null;
      // where the widget lands if it commits to the snap completely
      let snapX = freeX;
      let snapY = freeY;
      // and where it sits right now, part-way into the magnet's field
      let pullX = freeX;
      let pullY = freeY;
      let snapped = false;

      if (s.autoDock) {
        const dock = resolveDock(rect, a, s.margin, s.dockThreshold);
        if (dock) {
          zone = dock.zone;
          snapX = dock.x;
          snapY = dock.y;
          pullX = lerp(freeX, dock.x, dock.px);
          pullY = lerp(freeY, dock.y, dock.py);
          snapped = true;
        }
      }
      // only align against neighbours that share the monitor we are now over
      if (!zone && s.alignGuides && di === widget.display) {
        const snap = alignSnap(rect, neighbours, a, 10);
        snapX = pullX = snap.x;
        snapY = pullY = snap.y;
        snapped = snap.snappedX || snap.snappedY;
      }
      if (!zone && !snapped && s.snapToGrid) {
        snapX = pullX = snapToGrid(freeX, s.gridSize);
        snapY = pullY = snapToGrid(freeY, s.gridSize);
      }

      d.freeX = freeX;
      d.freeY = freeY;
      d.offX = pullX - freeX;
      d.offY = pullY - freeY;
      d.dock = zone;
      d.display = di;
      d.areas = areas;
      // let go here and the widget commits to the zone rather than hovering by it
      d.settleTo = { x: snapX, y: snapY };
      if (zone !== docking) setDocking(zone);
      start();
    },
    [dragging, cfg, docking, start],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    setDocking(null);
    const d = drag.current;
    d.settleFrom = { x: d.freeX + d.curOffX, y: d.freeY + d.curOffY };
    d.settleAt = performance.now();
    start();
  }, [dragging, start]);

  return { dragging, docking, onPointerDown, onPointerMove, onPointerUp };
}
