import type { DockZone } from "./geometry";

export type WidgetKind =
  | "clock"
  | "weather"
  | "system"
  | "calendar"
  | "tasks"
  | "music"
  | "notes"
  | "pomodoro"
  | "markets"
  | "launcher"
  | "network"
  | "battery"
  | "pet";

export type SizeKey = "sm" | "md" | "lg";

/**
 * One widget per kind — `kind` *is* the identity. There is no separate id, so
 * the desktop can never hold two of the same widget.
 */
export interface WidgetInstance {
  kind: WidgetKind;
  /** position *within* its display's work area, in logical pixels */
  x: number;
  y: number;
  size: SizeKey;
  z: number;
  locked: boolean;
  dock: DockZone | null;
  /** per-widget opacity multiplier, 0.3 - 1 */
  alpha: number;
  /** whether a desktop window is currently spawned for this widget */
  open: boolean;
  /** index into the list of monitors */
  display: number;
  /** widget-specific settings, merged over DEFAULT_CONFIG for its kind */
  config?: Record<string, unknown>;
  /** appearance overrides; unset means "use the kind's default" */
  accent?: string;
  theme?: "dark" | "light";
}
