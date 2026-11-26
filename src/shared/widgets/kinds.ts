import type { SizeKey, WidgetKind } from "@/shared/types/widget";

/**
 * The half of the widget catalogue a widget window needs: its identity and how
 * its tile is drawn. Deliberately free of icons, names and descriptions — those
 * are manager chrome and live in `app/manager/widgets/catalogue.ts`, so a
 * widget window never parses thirteen icon components to render one tile.
 */
export type TileTheme = "dark" | "light";
export type TileShape = "squircle" | "circle";

export interface TileLook {
  accent: string;
  /** flat black or flat white ground */
  theme: TileTheme;
  /** most tiles are squircles; a couple are true circles */
  shape: TileShape;
}

/** Uniform square tiles — the grid reads as one system when they all match. */
export const TILE: Record<SizeKey, [number, number]> = {
  sm: [176, 176],
  md: [216, 216],
  lg: [264, 264],
};

const PINK = "#ff4dd8";

export const LOOK: Record<WidgetKind, TileLook> = {
  clock: { accent: "#ff5b2e", theme: "light", shape: "circle" },
  weather: { accent: PINK, theme: "dark", shape: "squircle" },
  system: { accent: PINK, theme: "dark", shape: "squircle" },
  calendar: { accent: PINK, theme: "light", shape: "squircle" },
  tasks: { accent: PINK, theme: "light", shape: "squircle" },
  music: { accent: PINK, theme: "dark", shape: "squircle" },
  notes: { accent: PINK, theme: "light", shape: "squircle" },
  pomodoro: { accent: PINK, theme: "dark", shape: "squircle" },
  markets: { accent: "#3ddc84", theme: "dark", shape: "squircle" },
  launcher: { accent: PINK, theme: "dark", shape: "squircle" },
  network: { accent: PINK, theme: "dark", shape: "squircle" },
  pet: { accent: PINK, theme: "light", shape: "squircle" },
  battery: { accent: PINK, theme: "dark", shape: "squircle" },
};

/** Catalogue order — what the manager lists and what `seed()` walks. */
export const WIDGET_KINDS: WidgetKind[] = [
  "clock", "weather", "system", "calendar", "tasks", "music", "notes",
  "pomodoro", "markets", "launcher", "network", "pet", "battery",
];

export const lookOf = (k: WidgetKind): TileLook => LOOK[k];

export const sizeOf = (_k: WidgetKind, s: SizeKey): [number, number] => TILE[s];
