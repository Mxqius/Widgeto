import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { WidgetKind } from "@/shared/types/widget";
import type { WidgetBodyProps } from "./props";

export type { WidgetBodyProps } from "./props";

type Body = ComponentType<WidgetBodyProps>;

/**
 * One dynamic import per widget, so a widget window downloads and parses only
 * its own body instead of all thirteen.
 */
const LOADERS: Record<WidgetKind, () => Promise<{ default: Body }>> = {
  clock: () => import("./Clock"),
  weather: () => import("./Weather"),
  system: () => import("./System"),
  calendar: () => import("./Calendar"),
  tasks: () => import("./Tasks"),
  music: () => import("./Music"),
  notes: () => import("./Notes"),
  pomodoro: () => import("./Pomodoro"),
  markets: () => import("./Markets"),
  launcher: () => import("./Launcher"),
  network: () => import("./Network"),
  battery: () => import("./Battery"),
  pet: () => import("./Pet"),
};

/**
 * Which kinds actually fetch anything. The rest never load the query client,
 * which is the single largest dependency a widget window can avoid.
 */
export const NEEDS_QUERY: ReadonlySet<WidgetKind> = new Set<WidgetKind>([
  "weather", "markets", "calendar", "system", "network", "battery", "music",
]);

const CACHE = new Map<WidgetKind, LazyExoticComponent<Body>>();

export function widgetBody(kind: WidgetKind): LazyExoticComponent<Body> {
  let c = CACHE.get(kind);
  if (!c) {
    c = lazy(LOADERS[kind]);
    CACHE.set(kind, c);
  }
  return c;
}
