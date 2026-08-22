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

export type DockZone =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right"
  | "center";

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

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ArrangeMode = "grid" | "columns" | "cascade" | "ring";

export interface Settings {
  accent: string;
  widgetAlpha: number;
  blur: number;
  radius: number;
  gap: number;
  margin: number;
  gridSize: number;
  snapToGrid: boolean;
  autoDock: boolean;
  dockThreshold: number;
  alignGuides: boolean;
  autoArrange: boolean;
  arrangeMode: ArrangeMode;
  lockAll: boolean;
  showGrid: boolean;
  /** where widget windows sit in the z-order of the desktop */
  layer: "desktop" | "normal" | "top";
  managerAlwaysOnTop: boolean;
  /** register with the OS to start at login */
  launchAtLogin: boolean;
  /** come up as a tray icon rather than opening the manager */
  startInTray: boolean;
  /** global shortcut that opens quick capture; empty disables it */
  captureHotkey: string;
  reduceMotion: boolean;
  /** slow every poll down, always or only when unplugged */
  powerSaver: "off" | "onBattery" | "always";
  clock24h: boolean;
  temperatureUnit: "C" | "F";
  wallpaper: string;
  /** check GitHub Releases for a newer version shortly after startup */
  autoUpdateEnabled: boolean;
  /** version the user chose to skip; suppresses the background prompt for it */
  skippedUpdateVersion: string | null;
}
