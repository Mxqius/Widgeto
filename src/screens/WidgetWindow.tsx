import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Lock, LockOpen, Maximize2, X } from "lucide-react";
import type { DockZone } from "@/lib/types";
import { alignSnap, resolveDock, snapToGrid } from "@/lib/layout";
import { useApp } from "@/store/useApp";
import { byKind, sizeOf } from "@/widgets/registry";
import { EVT, type Area, type ActionPayload, type MovedPayload } from "@/lib/desktop";
import { clamp, cn, isTauri } from "@/lib/utils";

/**
 * One widget, alone in its own frameless always-on-desktop OS window.
 * Dragging moves the *window*, snapping against the monitor work area.
 */
export default function WidgetWindow({ id }: { id: string }) {
  const widget = useApp((s) => s.widgets.find((w) => w.id === id));
  const settings = useApp((s) => s.settings);
  const areas = useApp((s) => s.areas);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // live drag bookkeeping — refs so pointermove never re-renders
  const drag = useRef({
    startX: 0,
    startY: 0,
    winX: 0,
    winY: 0,
    scale: 1,
    area: null as Area | null,
    others: [] as { x: number; y: number; w: number; h: number }[],
    dock: null as DockZone | null,
    x: 0,
    y: 0,
    raf: 0,
  });

  const area = areas[widget?.display ?? 0] ?? areas[0];

  /* -------------------------------------------------- config over the bus */
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    (async () => {
      const { listen, emit } = await import("@tauri-apps/api/event");
      un = await listen<{ widgets: unknown; settings: unknown; areas: unknown }>(
        EVT.config(id),
        (e) => {
          const p = e.payload as {
            widgets: NonNullable<typeof widget>[];
            settings: typeof settings;
            areas: Area[];
          };
          useApp.setState({ widgets: p.widgets, settings: p.settings, areas: p.areas });
        },
      );
      await emit(EVT.hello, { id });
    })();
    return () => un?.();
  }, [id]);

  /* --------------------------------------------------------------- theme */
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", settings.accent);
    r.setProperty("--widget-alpha", String(settings.widgetAlpha));
    r.setProperty("--widget-blur", `${settings.blur}px`);
  }, [settings.accent, settings.widgetAlpha, settings.blur]);

  const send = useCallback(async (kind: ActionPayload["kind"]) => {
    if (!isTauri()) return;
    const { emit } = await import("@tauri-apps/api/event");
    await emit(EVT.action, { id, kind } satisfies ActionPayload);
  }, [id]);

  /* ---------------------------------------------------------- dragging */

  const onPointerDown = useCallback(
    async (e: React.PointerEvent) => {
      if (!widget || widget.locked || settings.lockAll) return;
      if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }

      const [w, h] = sizeOf(widget.kind, widget.size);
      drag.current.startX = e.screenX;
      drag.current.startY = e.screenY;
      drag.current.area = area ?? null;
      drag.current.dock = null;
      drag.current.x = widget.x;
      drag.current.y = widget.y;
      drag.current.others = useApp
        .getState()
        .widgets.filter((o) => o.id !== id && o.open && o.display === widget.display)
        .map((o) => {
          const [ow, oh] = sizeOf(o.kind, o.size);
          return { x: o.x, y: o.y, w: ow, h: oh };
        });
      void w;
      void h;

      if (isTauri()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const [pos, scale] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
        drag.current.scale = scale;
        drag.current.winX = pos.x / scale;
        drag.current.winY = pos.y / scale;
      }
      setDragging(true);
    },
    [widget, settings.lockAll, area, id],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !widget) return;
      const a = drag.current.area;
      if (!a) return;
      const [w, h] = sizeOf(widget.kind, widget.size);

      // unsnapped target, in work-area-local logical pixels
      let nx = drag.current.winX - a.x + (e.screenX - drag.current.startX);
      let ny = drag.current.winY - a.y + (e.screenY - drag.current.startY);
      nx = clamp(nx, -w * 0.4, a.w - w * 0.6);
      ny = clamp(ny, -h * 0.25, a.h - h * 0.4);

      const rect = { x: nx, y: ny, w, h };
      let zone: DockZone | null = null;
      let snapped = false;

      if (settings.autoDock) {
        const d = resolveDock(rect, a, settings.margin, settings.dockThreshold);
        if (d) {
          zone = d.zone;
          nx = d.x;
          ny = d.y;
          snapped = true;
        }
      }
      if (!zone && settings.alignGuides) {
        const s = alignSnap(rect, drag.current.others, a, 10);
        nx = s.x;
        ny = s.y;
        snapped = s.snappedX || s.snappedY;
      }
      if (!zone && !snapped && settings.snapToGrid) {
        nx = snapToGrid(nx, settings.gridSize);
        ny = snapToGrid(ny, settings.gridSize);
      }

      drag.current.dock = zone;
      drag.current.x = nx;
      drag.current.y = ny;

      if (!drag.current.raf) {
        drag.current.raf = requestAnimationFrame(async () => {
          drag.current.raf = 0;
          if (!isTauri()) return;
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const { LogicalPosition } = await import("@tauri-apps/api/dpi");
          await getCurrentWindow().setPosition(
            new LogicalPosition(Math.round(drag.current.x + a.x), Math.round(drag.current.y + a.y)),
          );
        });
      }
    },
    [dragging, widget, settings],
  );

  const onPointerUp = useCallback(async () => {
    if (!dragging) return;
    setDragging(false);
    const { x, y, dock } = drag.current;
    useApp.getState().move(id, x, y, dock);
    if (!isTauri()) return;
    const { emit } = await import("@tauri-apps/api/event");
    await emit(EVT.moved, { id, x, y, dock } satisfies MovedPayload);
  }, [dragging, id]);

  if (!widget) {
    // waiting for the manager's first config broadcast
    return <div className="surface h-full w-full animate-pulse rounded-[20px] opacity-40" />;
  }

  const def = byKind(widget.kind);
  const Body = def.component;
  const locked = widget.locked || settings.lockAll;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: widget.alpha, scale: dragging ? 1.015 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn("surface group relative h-full w-full overflow-hidden select-none")}
      style={{
        borderRadius: settings.radius,
        cursor: locked ? "default" : dragging ? "grabbing" : "grab",
        // @ts-expect-error custom property
        "--accent": def.accent,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => send("cycle-size")}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: def.accent }}
      />

      <motion.div
        data-nodrag
        initial={false}
        animate={{ opacity: hovered && !dragging ? 1 : 0, y: hovered && !dragging ? 0 : -6 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: hovered && !dragging ? "auto" : "none" }}
        className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 rounded-lg
                   border border-white/[0.07] bg-ink-900/80 p-0.5 backdrop-blur-md"
      >
        <Chip title="Resize" onClick={() => send("cycle-size")}>
          <Maximize2 size={12} />
        </Chip>
        <Chip title={locked ? "Unlock" : "Lock"} onClick={() => send("lock")}>
          {locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </Chip>
        <Chip title="Hide" danger onClick={() => send("close")}>
          <X size={13} />
        </Chip>
      </motion.div>

      <Body id={widget.id} size={widget.size} />
    </motion.div>
  );
}

function Chip({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded-md text-ink-400 transition-colors",
        danger ? "hover:bg-red-500/20 hover:text-red-300" : "hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
