import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { SizeKey, WidgetKind } from "@/lib/types";

export interface WidgetBodyProps {
  kind: WidgetKind;
  size: SizeKey;
}

type Body = ComponentType<WidgetBodyProps>;

/**
 * One dynamic import per widget, so a widget window downloads and parses only
 * its own body instead of all twelve.
 */
const LOADERS: Record<WidgetKind, () => Promise<{ default: Body }>> = {
  clock: () => import("./ClockWidget"),
  weather: () => import("./WeatherWidget"),
  system: () => import("./SystemWidget"),
  calendar: () => import("./CalendarWidget"),
  tasks: () => import("./TasksWidget"),
  music: () => import("./MusicWidget"),
  notes: () => import("./NotesWidget"),
  pomodoro: () => import("./PomodoroWidget"),
  markets: () => import("./MarketsWidget"),
  launcher: () => import("./LauncherWidget"),
  network: () => import("./NetworkWidget"),
  battery: () => import("./BatteryWidget"),
};

const CACHE = new Map<WidgetKind, LazyExoticComponent<Body>>();

export function widgetBody(kind: WidgetKind): LazyExoticComponent<Body> {
  let c = CACHE.get(kind);
  if (!c) {
    c = lazy(LOADERS[kind]);
    CACHE.set(kind, c);
  }
  return c;
}
