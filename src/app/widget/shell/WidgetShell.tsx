import { Suspense, useMemo } from "react";
import { Lock, LockOpen, Maximize2, X } from "lucide-react";
import type { DockZone } from "@/shared/types/geometry";
import type { WidgetInstance } from "@/shared/types/widget";
import type { ActionPayload, WidgetSettings } from "@/shared/desktop/protocol";
import { lookOf } from "@/shared/widgets/kinds";
import { cx } from "@/shared/lib/cx";
import { widgetBody } from "../bodies";
import { PrefsContext } from "../prefs";
import { ShellChip } from "./ShellChip";
import { useT } from "../i18n";

export function WidgetShell({
  widget,
  settings,
  onBattery,
  dragging,
  docking,
  hovered,
  onHover,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onAction,
}: {
  widget: WidgetInstance;
  settings: WidgetSettings;
  dragging: boolean;
  /** the zone the widget is currently being pulled into, if any */
  docking: DockZone | null;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onAction: (a: ActionPayload["action"]) => void;
  onBattery: boolean;
}) {
  const t = useT();
  const look = lookOf(widget.kind);
  const Body = widgetBody(widget.kind);
  const accent = widget.accent ?? look.accent;
  const theme = widget.theme ?? look.theme;
  const locked = widget.locked || settings.lockAll;

  const prefs = useMemo(
    () => ({
      clock24h: settings.clock24h,
      temperatureUnit: settings.temperatureUnit,
      powerSaver: settings.powerSaver,
      lowMemory: settings.lowMemory,
      onBattery,
      config: widget.config ?? EMPTY_CONFIG,
    }),
    [
      settings.clock24h,
      settings.temperatureUnit,
      settings.powerSaver,
      settings.lowMemory,
      onBattery,
      widget.config,
    ],
  );

  const circle = look.shape === "circle";
  const translucent = settings.widgetAlpha < 0.98;

  return (
    <div
      className={cx(
        "tile group h-full w-full select-none",
        theme === "dark" ? "tile-dark" : "tile-light",
        translucent && "tile-translucent",
      )}
      style={{
        borderRadius: circle ? "50%" : settings.radius,
        cursor: locked ? "default" : dragging ? "grabbing" : "grab",
        // lifted while carried, and pressed back down as it takes to a zone,
        // so the magnet reads on the tile itself and not just in its path
        transform: settings.reduceMotion
          ? "none"
          : docking
            ? "scale(1.005)"
            : dragging
              ? "scale(1.025)"
              : "none",
        transition: settings.reduceMotion
          ? "none"
          : "transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms cubic-bezier(0.22,1,0.36,1)",
        boxShadow: docking
          ? `0 18px 44px -16px rgba(0,0,0,0.6), 0 0 0 1.5px ${accent}`
          : dragging
            ? "0 30px 64px -18px rgba(0,0,0,0.7)"
            : "0 10px 26px -14px rgba(0,0,0,0.5)",
        // @ts-expect-error custom property
        "--accent": accent,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div
        data-nodrag
        className={cx(
          "absolute z-20 flex items-center gap-0.5 rounded-full p-0.5 transition-all duration-150",
          theme === "dark" ? "bg-white/12 text-white" : "bg-black/8 text-black",
          circle ? "top-2 left-1/2 -translate-x-1/2" : "top-2 end-2",
          hovered && !dragging
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        style={{ backdropFilter: settings.lowMemory ? undefined : "blur(8px)" }}
      >
        <ShellChip title={t("Resize")} onClick={() => onAction("cycle-size")}>
          <Maximize2 size={11} />
        </ShellChip>
        <ShellChip title={locked ? t("Unlock") : t("Lock")} onClick={() => onAction("lock")}>
          {locked ? <Lock size={11} /> : <LockOpen size={11} />}
        </ShellChip>
        <ShellChip title={t("Remove")} onClick={() => onAction("hide")}>
          <X size={12} />
        </ShellChip>
      </div>

      <Suspense fallback={null}>
        <PrefsContext.Provider value={prefs}>
          <Body kind={widget.kind} size={widget.size} />
        </PrefsContext.Provider>
      </Suspense>
    </div>
  );
}

/** Hoisted so an unconfigured widget does not hand its body a new object each render. */
const EMPTY_CONFIG: Record<string, unknown> = {};
