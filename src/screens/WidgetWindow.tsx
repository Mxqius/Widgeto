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
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { BROWSER_AREA } from "@/lib/desktop";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * One widget, alone in its own frameless always-on-desktop OS window.
 *
 * Deliberately does NOT use the zustand store: this window only ever needs its
 * own record, which the manager pushes over the event bus. Keeping it out of
 * the store means a widget window loads neither the store nor the manager UI.
 */
/** Outside Tauri there is no manager to talk to, so render a default tile. */
function previewConfig(kind: WidgetKind): ConfigPayload {
  return {
    widget: {
      kind, size: "md", x: 0, y: 0, z: 1,
      locked: false, dock: null, alpha: 1, open: true, display: 0,
    },
    settings: DEFAULT_SETTINGS,
    area: BROWSER_AREA,
    neighbours: [],
  };
}

export default function WidgetWindow({ kind }: { kind: WidgetKind }) {
  const [cfg, setCfg] = useState<ConfigPayload | null>(() =>
    isTauri() ? null : previewConfig(kind),
  );
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
    return <div className="tile tile-dark h-full w-full opacity-25" />;
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

  const circle = def.shape === "circle";
  const translucent = settings.widgetAlpha < 0.98;

  return (
    <div
      className={cn(
        "tile group h-full w-full select-none",
        def.theme === "dark" ? "tile-dark" : "tile-light",
        translucent && "tile-translucent",
      )}
      style={{
        borderRadius: circle ? "50%" : settings.radius,
        cursor: locked ? "default" : dragging ? "grabbing" : "grab",
        transform: dragging ? "scale(1.015)" : "none",
        transition: "transform 160ms cubic-bezier(0.16,1,0.3,1)",
        boxShadow: dragging
          ? "0 26px 60px -18px rgba(0,0,0,0.65)"
          : "0 10px 26px -14px rgba(0,0,0,0.5)",
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
        data-nodrag
        className={cn(
          "absolute z-20 flex items-center gap-0.5 rounded-full p-0.5 transition-all duration-150",
          def.theme === "dark" ? "bg-white/12 text-white" : "bg-black/8 text-black",
          circle ? "top-2 left-1/2 -translate-x-1/2" : "top-2 right-2",
          hovered && !dragging
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        style={{ backdropFilter: "blur(8px)" }}
      >
        <Chip title="Resize" onClick={() => onAction("cycle-size")}>
          <Maximize2 size={11} />
        </Chip>
        <Chip title={locked ? "Unlock" : "Lock"} onClick={() => onAction("lock")}>
          {locked ? <Lock size={11} /> : <LockOpen size={11} />}
        </Chip>
        <Chip title="Remove" onClick={() => onAction("hide")}>
          <X size={12} />
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex size-[22px] items-center justify-center rounded-full opacity-70
                 transition-opacity hover:opacity-100"
    >
      {children}
    </button>
  );
}
