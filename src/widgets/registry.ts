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
export interface WidgetDef {
  kind: WidgetKind;
  name: string;
  description: string;
  icon: ComponentType<LucideProps>;
  accent: string;
  sizes: Record<SizeKey, [number, number]>;
}

export const WIDGETS: WidgetDef[] = [
  {
    kind: "clock", name: "Clock", description: "Analog + digital, world time",
    icon: Clock, accent: "#7c6cff",
    sizes: { sm: [200, 200], md: [252, 252], lg: [320, 320] },
  },
  {
    kind: "weather", name: "Weather", description: "Conditions and 5-day forecast",
    icon: Cloud, accent: "#4aa8ff",
    sizes: { sm: [240, 156], md: [292, 212], lg: [368, 262] },
  },
  {
    kind: "system", name: "System", description: "CPU, memory and disk load",
    icon: Gauge, accent: "#31d0aa",
    sizes: { sm: [240, 156], md: [300, 200], lg: [372, 250] },
  },
  {
    kind: "calendar", name: "Calendar", description: "Month view with events",
    icon: CalendarDays, accent: "#ff6b8b",
    sizes: { sm: [258, 236], md: [300, 288], lg: [356, 336] },
  },
  {
    kind: "tasks", name: "Tasks", description: "Quick checklist with progress",
    icon: ListTodo, accent: "#f2b544",
    sizes: { sm: [258, 206], md: [300, 268], lg: [340, 344] },
  },
  {
    kind: "music", name: "Now Playing", description: "Media controls and scrubber",
    icon: Music4, accent: "#e05fd0",
    sizes: { sm: [280, 124], md: [300, 186], lg: [320, 330] },
  },
  {
    kind: "notes", name: "Notes", description: "Scratchpad that saves as you type",
    icon: StickyNote, accent: "#f2b544",
    sizes: { sm: [240, 186], md: [284, 236], lg: [340, 300] },
  },
  {
    kind: "pomodoro", name: "Focus Timer", description: "Pomodoro with session streak",
    icon: Timer, accent: "#ff7a5c",
    sizes: { sm: [220, 206], md: [258, 250], lg: [300, 300] },
  },
  {
    kind: "markets", name: "Markets", description: "Watchlist tickers and sparklines",
    icon: TrendingUp, accent: "#31d0aa",
    sizes: { sm: [258, 186], md: [300, 236], lg: [356, 292] },
  },
  {
    kind: "launcher", name: "Quick Launch", description: "Pinned apps and shortcuts",
    icon: LayoutGrid, accent: "#8f9bff",
    sizes: { sm: [220, 128], md: [262, 172], lg: [304, 222] },
  },
  {
    kind: "network", name: "Network", description: "Live throughput graph",
    icon: Activity, accent: "#4aa8ff",
    sizes: { sm: [258, 156], md: [300, 192], lg: [356, 242] },
  },
  {
    kind: "battery", name: "Power", description: "Battery health and estimates",
    icon: BatteryCharging, accent: "#31d0aa",
    sizes: { sm: [220, 146], md: [258, 182], lg: [300, 222] },
  },
];

export const WIDGET_KINDS = WIDGETS.map((w) => w.kind);

const INDEX = new Map(WIDGETS.map((w) => [w.kind, w]));

export const byKind = (k: WidgetKind) => INDEX.get(k)!;
export const sizeOf = (k: WidgetKind, s: SizeKey) => INDEX.get(k)!.sizes[s];
