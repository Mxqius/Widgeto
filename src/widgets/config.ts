import type { WidgetKind } from "@/lib/types";

export interface Note {
  title: string;
  body: string;
}

export interface QuickLink {
  name: string;
  url: string;
}

/**
 * Per-widget settings. Every kind has an entry (often empty) so the shape is
 * exhaustive and a widget's own panel can be derived from it.
 */
export const DEFAULT_CONFIG = {
  clock: { label: "AMS", showSeconds: true },
  weather: { place: "Amsterdam", refreshSec: 600 },
  system: { refreshSec: 2 },
  calendar: { sources: [] as string[], days: 14 },
  tasks: {},
  music: { refreshSec: 2 },
  notes: {
    fontSize: 12,
    /** the note the widget is currently showing */
    active: 0,
    notes: [
      { title: "Scratch", body: "- [ ] try the capture hotkey\n- [x] pet the cat" },
    ] as Note[],
  },
  pomodoro: { focusMin: 25, shortMin: 5, longMin: 15 },
  markets: { symbols: ["BTC", "ETH", "SOL"] as string[], refreshSec: 60 },
  launcher: {
    links: [
      { name: "GitHub", url: "https://github.com" },
      { name: "Figma", url: "https://figma.com" },
      { name: "Tauri", url: "https://tauri.app" },
      { name: "Vercel", url: "https://vercel.com" },
      { name: "Spotify", url: "https://open.spotify.com" },
      { name: "Excalidraw", url: "https://excalidraw.com" },
    ] as QuickLink[],
  },
  network: { refreshSec: 2 },
  battery: { refreshSec: 20 },
  pet: { name: "Mochi", hue: 320, species: "cat" as "cat" | "bun" | "blob" | "fox" },
} satisfies Record<WidgetKind, object>;

export type ConfigOf<K extends WidgetKind> = (typeof DEFAULT_CONFIG)[K];

/** Merge a stored partial over the defaults for that kind. */
export function configOf<K extends WidgetKind>(
  kind: K,
  stored: Record<string, unknown> | undefined,
): ConfigOf<K> {
  return { ...DEFAULT_CONFIG[kind], ...(stored ?? {}) } as ConfigOf<K>;
}

/** Which kinds expose a settings panel at all. */
export const HAS_CONFIG = new Set<WidgetKind>([
  "clock", "weather", "notes", "pomodoro", "markets", "launcher", "pet",
]);

/** Kinds that poll for data and therefore expose a refresh interval. */
export const POLLING: Partial<Record<WidgetKind, { min: number; max: number }>> = {
  system: { min: 1, max: 60 },
  network: { min: 1, max: 60 },
  battery: { min: 5, max: 300 },
  music: { min: 1, max: 30 },
  weather: { min: 60, max: 3600 },
  markets: { min: 15, max: 900 },
};
