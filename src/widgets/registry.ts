import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Activity, BatteryCharging, CalendarDays, Clock, Cloud, Gauge,
  LayoutGrid, ListTodo, Music4, StickyNote, Timer, TrendingUp,
} from "lucide-react";
import type { SizeKey, WidgetKind } from "@/lib/types";

/**
 * Metadata only — deliberately free of any widget component import so the
 * manager window can describe all twelve widgets without parsing their code.
 * Bodies are pulled in on demand by `loader.ts`.
 */
export type TileTheme = "dark" | "light";
export type TileShape = "squircle" | "circle";

export interface WidgetDef {
  kind: WidgetKind;
  name: string;
  description: string;
  icon: ComponentType<LucideProps>;
  accent: string;
  /** flat black or flat white ground */
  theme: TileTheme;
  /** most tiles are squircles; a couple are true circles */
  shape: TileShape;
  sizes: Record<SizeKey, [number, number]>;
}

/** Uniform square tiles — the grid reads as one system when they all match. */
const TILE: Record<SizeKey, [number, number]> = {
  sm: [176, 176],
  md: [216, 216],
  lg: [264, 264],
};

export const WIDGETS: WidgetDef[] = [
  {
    kind: "clock", name: "Clock", description: "Analog + digital, world time",
    icon: Clock, accent: "#ff5b2e",
    theme: "light", shape: "circle",
    sizes: TILE,
  },
  {
    kind: "weather", name: "Weather", description: "Conditions and 5-day forecast",
    icon: Cloud, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "system", name: "System", description: "CPU, memory and disk load",
    icon: Gauge, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "calendar", name: "Calendar", description: "Month view with events",
    icon: CalendarDays, accent: "#ff4dd8",
    theme: "light", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "tasks", name: "Tasks", description: "Quick checklist with progress",
    icon: ListTodo, accent: "#ff4dd8",
    theme: "light", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "music", name: "Now Playing", description: "Media controls and scrubber",
    icon: Music4, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "notes", name: "Notes", description: "Scratchpad that saves as you type",
    icon: StickyNote, accent: "#ff4dd8",
    theme: "light", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "pomodoro", name: "Focus Timer", description: "Pomodoro with session streak",
    icon: Timer, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "markets", name: "Markets", description: "Watchlist tickers and sparklines",
    icon: TrendingUp, accent: "#3ddc84",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "launcher", name: "Quick Launch", description: "Pinned apps and shortcuts",
    icon: LayoutGrid, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "network", name: "Network", description: "Live throughput graph",
    icon: Activity, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
  {
    kind: "battery", name: "Power", description: "Battery health and estimates",
    icon: BatteryCharging, accent: "#ff4dd8",
    theme: "dark", shape: "squircle",
    sizes: TILE,
  },
];

export const WIDGET_KINDS = WIDGETS.map((w) => w.kind);

const INDEX = new Map(WIDGETS.map((w) => [w.kind, w]));

export const byKind = (k: WidgetKind) => INDEX.get(k)!;
export const sizeOf = (k: WidgetKind, s: SizeKey) => INDEX.get(k)!.sizes[s];
