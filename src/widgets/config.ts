import type { WidgetKind } from "@/lib/types";

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
  weather: { place: "Amsterdam" },
  system: {},
  calendar: {},
  tasks: {},
  music: {},
  notes: { fontSize: 12 },
  pomodoro: { focusMin: 25, shortMin: 5, longMin: 15 },
  markets: { symbols: ["BTC", "ETH", "SOL"] as string[] },
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
  network: {},
  battery: {},
  pet: { name: "Mochi", hue: 320 },
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
