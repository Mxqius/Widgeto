import type { ArrangeMode } from "./geometry";
import type { AiProvider } from "@/shared/ai/client";

export type PowerSaver = "off" | "onBattery" | "always";

/** A floating pill below the top edge, or a notch hanging from it. */
export type IslandStyle = "pill" | "notch";

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
  powerSaver: PowerSaver;
  /**
   * Trades looks for footprint: drops the backdrop blur, stretches every poll
   * and asks WebView2 for its low-end device profile. The native half only
   * takes effect on the next launch.
   */
  lowMemory: boolean;
  /** the Dynamic Island at the top of the primary display */
  island: boolean;
  /** brief island pop-outs for track changes, charging, timers and notes */
  islandActivities: boolean;
  /** tuck the island away while a full-screen app is in front */
  islandHideFullscreen: boolean;
  /** the island's outline: a floating pill, or a notch attached to the top edge */
  islandStyle: IslandStyle;
  /** global shortcut that tucks the island into the top edge and back; empty disables it */
  islandTuckHotkey: string;
  /** the Ask tab in the island */
  aiEnabled: boolean;
  aiProvider: AiProvider;
  /** the model picked for each provider, so switching back keeps it */
  aiModels: Record<AiProvider, string>;
  /** endpoints for the OpenAI-compatible providers */
  aiBaseUrls: { openai: string; local: string };
  /** global shortcut that opens the island's Ask tab; empty disables it */
  aiHotkey: string;
  clock24h: boolean;
  temperatureUnit: "C" | "F";
  wallpaper: string;
  /** check GitHub Releases for a newer version shortly after startup */
  autoUpdateEnabled: boolean;
  /** version the user chose to skip; suppresses the background prompt for it */
  skippedUpdateVersion: string | null;
}
