import type { ComponentType } from "react";
import { Tile, type Theme } from "./ui";
import { CalendarWidget, ClockWidget, PomodoroWidget } from "./time";
import { BatteryWidget, MarketsWidget, NetworkWidget, SystemWidget, WeatherWidget } from "./data";
import { LauncherWidget, MusicWidget, NotesWidget, PetWidget, TasksWidget } from "./personal";

export type Kind =
  | "clock" | "weather" | "system" | "calendar" | "tasks" | "music" | "notes"
  | "pomodoro" | "markets" | "launcher" | "network" | "pet" | "battery";

export interface WidgetInfo {
  kind: Kind;
  name: string;
  blurb: string;
  /** where its data comes from */
  source: "machine" | "live" | "local";
  theme: Theme;
  circle?: boolean;
  accent: string;
  Body: ComponentType;
}

const PINK = "#ff4dd8";

export const WIDGETS: WidgetInfo[] = [
  { kind: "clock", name: "Clock", blurb: "An analogue face with a city label and a sweeping second hand.", source: "local", theme: "light", circle: true, accent: "#ff5b2e", Body: ClockWidget },
  { kind: "weather", name: "Weather", blurb: "Now, feels-like and conditions for any place, from live public data.", source: "live", theme: "dark", accent: PINK, Body: WeatherWidget },
  { kind: "system", name: "System", blurb: "CPU, memory, disk and uptime read straight from your machine.", source: "machine", theme: "dark", accent: PINK, Body: SystemWidget },
  { kind: "calendar", name: "Calendar", blurb: "This week at a glance, the ISO week, and days left in the month.", source: "local", theme: "light", accent: PINK, Body: CalendarWidget },
  { kind: "tasks", name: "Tasks", blurb: "A short, local to-do list with a progress bar you can feel good about.", source: "local", theme: "light", accent: PINK, Body: TasksWidget },
  { kind: "music", name: "Now Playing", blurb: "Whatever's playing in any app — cover, title and controls.", source: "machine", theme: "dark", accent: PINK, Body: MusicWidget },
  { kind: "notes", name: "Notes", blurb: "A sticky note that keeps whatever you throw at it, offline.", source: "local", theme: "light", accent: PINK, Body: NotesWidget },
  { kind: "pomodoro", name: "Focus Timer", blurb: "Focus, short and long breaks, with a chime when a session ends.", source: "local", theme: "dark", accent: PINK, Body: PomodoroWidget },
  { kind: "markets", name: "Markets", blurb: "Live prices and daily change for the tickers you follow.", source: "live", theme: "dark", accent: "#3ddc84", Body: MarketsWidget },
  { kind: "launcher", name: "Quick Launch", blurb: "Six slots for the apps, folders and links you open all day.", source: "local", theme: "dark", accent: PINK, Body: LauncherWidget },
  { kind: "network", name: "Network", blurb: "Real throughput up and down, with a rolling history.", source: "machine", theme: "dark", accent: PINK, Body: NetworkWidget },
  { kind: "pet", name: "Pet", blurb: "Mochi breathes, blinks, follows your cursor and loves a pat.", source: "local", theme: "light", accent: PINK, Body: PetWidget },
  { kind: "battery", name: "Power", blurb: "Charge, charging state and time remaining on laptops.", source: "machine", theme: "dark", accent: PINK, Body: BatteryWidget },
];

export const byKind = (k: Kind) => WIDGETS.find((w) => w.kind === k)!;

/** A widget tile, ready to drop anywhere. */
export function Widget({ kind, size, className }: { kind: Kind; size?: number; className?: string }) {
  const w = byKind(kind);
  return (
    <Tile theme={w.theme} circle={w.circle} accent={w.accent} size={size} className={className}>
      <w.Body />
    </Tile>
  );
}
