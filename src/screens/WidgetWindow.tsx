import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, LockOpen, Maximize2, X } from "lucide-react";
import type { DockZone, Settings, WidgetInstance, WidgetKind } from "@/lib/types";
import { alignSnap, resolveDock, snapToGrid } from "@/lib/layout";
import { byKind, sizeOf } from "@/widgets/registry";
import { widgetBody } from "@/widgets/loader";
import { PrefsContext } from "@/widgets/prefs";
import {
  EVT,
  type ActionPayload,
  type ConfigPayload,
  type MovedPayload,
} from "@/lib/desktop";
import { clamp, cn, isTauri } from "@/lib/utils";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * One widget, alone in its own frameless always-on-desktop OS window.
 *
 * Deliberately does NOT use the zustand store: this window only ever needs its
 * own record, which the manager pushes over the event bus. Keeping it out of
 * the store means a widget window loads neither the store nor the manager UI.
 */
export default function WidgetWindow({ kind }: { kind: WidgetKind }) {
  const [cfg, setCfg] = useState<ConfigPayload | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // live drag bookkeeping — refs so pointermove never re-renders
  const drag = useRef({
    startX: 0,
    startY: 0,
    winX: 0,
    winY: 0,
    x: 0,
    y: 0,
    dock: null as DockZone | null,
    raf: 0,
  });

  /* -------------------------------------------------- config over the bus */
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    let alive = true;
    (async () => {
      const { listen, emit } = await import("@tauri-apps/api/event");
      un = await listen<ConfigPayload>(EVT.config(kind), (e) => {
        if (alive) setCfg(e.payload);
      });
      await emit(EVT.hello, { kind });
    })();
    return () => {
      alive = false;
      un?.();
    };
  }, [kind]);

  /* --------------------------------------------------------------- theme */
  const settings = cfg?.settings;
  useEffect(() => {
    if (!settings) return;
    const r = document.documentElement.style;
    r.setProperty("--accent", settings.accent);
    r.setProperty("--widget-alpha", String(settings.widgetAlpha));
    r.setProperty("--widget-blur", `${settings.blur}px`);
  }, [settings?.accent, settings?.widgetAlpha, settings?.blur, settings]);

  const send = useCallback(
    async (action: ActionPayload["action"]) => {
      if (!isTauri()) return;
      const { emit } = await import("@tauri-apps/api/event");
      await emit(EVT.action, { kind, action } satisfies ActionPayload);
    },
    [kind],
  );

  /* ------------------------------------------------------------ dragging */

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

      drag.current.startX = e.screenX;
      drag.current.startY = e.screenY;
      drag.current.dock = null;
      drag.current.x = widget.x;
      drag.current.y = widget.y;

      if (isTauri()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const [pos, scale] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
        drag.current.winX = pos.x / scale;
        drag.current.winY = pos.y / scale;
      }
      setDragging(true);
    },
    [cfg],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !cfg) return;
      const { widget, settings: s, area: a, neighbours } = cfg;
      const [w, h] = sizeOf(widget.kind, widget.size);

      // unsnapped target, in work-area-local logical pixels
      let nx = drag.current.winX - a.x + (e.screenX - drag.current.startX);
      let ny = drag.current.winY - a.y + (e.screenY - drag.current.startY);
      nx = clamp(nx, -w * 0.4, a.w - w * 0.6);
      ny = clamp(ny, -h * 0.25, a.h - h * 0.4);

      const rect: Rect = { x: nx, y: ny, w, h };
      let zone: DockZone | null = null;
      let snapped = false;

      if (s.autoDock) {
        const d = resolveDock(rect, a, s.margin, s.dockThreshold);
        if (d) {
          zone = d.zone;
          nx = d.x;
          ny = d.y;
          snapped = true;
        }
      }
      if (!zone && s.alignGuides) {
        const snap = alignSnap(rect, neighbours, a, 10);
        nx = snap.x;
        ny = snap.y;
        snapped = snap.snappedX || snap.snappedY;
      }
      if (!zone && !snapped && s.snapToGrid) {
        nx = snapToGrid(nx, s.gridSize);
        ny = snapToGrid(ny, s.gridSize);
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
    [dragging, cfg],
  );

  const onPointerUp = useCallback(async () => {
    if (!dragging) return;
    setDragging(false);
    const { x, y, dock } = drag.current;
    // reflect locally right away; the manager is the one that persists it
    setCfg((c) => (c ? { ...c, widget: { ...c.widget, x, y, dock } } : c));
    if (!isTauri()) return;
    const { emit } = await import("@tauri-apps/api/event");
    await emit(EVT.moved, { kind, x, y, dock } satisfies MovedPayload);
  }, [dragging, kind]);

  if (!cfg) {
    // waiting for the manager's first config broadcast
    return <div className="surface h-full w-full rounded-[20px] opacity-30" />;
  }

  return (
    <WidgetShell
      widget={cfg.widget}
      settings={cfg.settings}
      dragging={dragging}
      hovered={hovered}
      onHover={setHovered}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onAction={send}
    />
  );
}

function WidgetShell({
  widget,
  settings,
  dragging,
  hovered,
  onHover,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onAction,
}: {
  widget: WidgetInstance;
  settings: Settings;
  dragging: boolean;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onAction: (a: ActionPayload["action"]) => void;
}) {
  const def = byKind(widget.kind);
  const Body = widgetBody(widget.kind);
  const locked = widget.locked || settings.lockAll;
  const prefs = useMemo(
    () => ({ clock24h: settings.clock24h, temperatureUnit: settings.temperatureUnit }),
    [settings.clock24h, settings.temperatureUnit],
  );

  return (
    <div
      className="surface group relative h-full w-full overflow-hidden select-none"
      style={{
        borderRadius: settings.radius,
        opacity: widget.alpha,
        cursor: locked ? "default" : dragging ? "grabbing" : "grab",
        transform: dragging ? "scale(1.012)" : "none",
        transition: "transform 140ms cubic-bezier(0.16,1,0.3,1)",
        // @ts-expect-error custom property
        "--accent": def.accent,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onDoubleClick={() => onAction("cycle-size")}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full opacity-[0.16] blur-3xl"
        style={{ background: def.accent }}
      />

      <div
        data-nodrag
        className={cn(
          "absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 rounded-lg border",
          "border-white/[0.07] bg-ink-900/80 p-0.5 backdrop-blur-md transition-all duration-150",
          hovered && !dragging
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1.5 opacity-0",
        )}
      >
        <Chip title="Resize" onClick={() => onAction("cycle-size")}>
          <Maximize2 size={12} />
        </Chip>
        <Chip title={locked ? "Unlock" : "Lock"} onClick={() => onAction("lock")}>
          {locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </Chip>
        <Chip title="Hide" danger onClick={() => onAction("hide")}>
          <X size={13} />
        </Chip>
      </div>

      <Suspense fallback={null}>
        <PrefsContext.Provider value={prefs}>
          <Body kind={widget.kind} size={widget.size} />
        </PrefsContext.Provider>
      </Suspense>
    </div>
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
