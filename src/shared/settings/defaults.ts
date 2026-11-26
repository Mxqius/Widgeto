import type { Settings } from "@/shared/types/settings";

/**
 * Standalone so both the manager's store and a widget window can read it
 * without a widget window having to import the store.
 */
export const DEFAULT_SETTINGS: Settings = {
  accent: "#ff4dd8",
  widgetAlpha: 1,
  blur: 18,
  radius: 30,
  gap: 16,
  margin: 24,
  gridSize: 8,
  snapToGrid: true,
  autoDock: true,
  dockThreshold: 56,
  alignGuides: true,
  autoArrange: false,
  arrangeMode: "grid",
  lockAll: false,
  showGrid: true,
  layer: "desktop",
  managerAlwaysOnTop: false,
  launchAtLogin: false,
  startInTray: false,
  captureHotkey: "CommandOrControl+Shift+N",
  reduceMotion: false,
  powerSaver: "onBattery",
  lowMemory: false,
  island: true,
  islandActivities: true,
  islandHideFullscreen: true,
  clock24h: true,
  temperatureUnit: "C",
  wallpaper: "aurora",
  autoUpdateEnabled: true,
  skippedUpdateVersion: null,
};
