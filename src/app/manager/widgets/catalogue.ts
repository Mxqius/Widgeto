import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Activity, BatteryCharging, CalendarDays, Clock, Cloud, Gauge,
  LayoutGrid, ListTodo, Music4, PawPrint, StickyNote, Timer, TrendingUp,
} from "lucide-react";
import type { WidgetKind } from "@/shared/types/widget";
import { LOOK, WIDGET_KINDS, type TileLook } from "@/shared/widgets/kinds";

/**
 * The half of the catalogue only the manager needs: the human-facing name,
 * blurb and icon for each widget.
 *
 * Kept apart from `shared/widgets/kinds` on purpose. These thirteen icon
 * components are React components, and a widget window that renders one tile
 * has no use for the other twelve — nor for any of them, since the tile shell
 * never draws an icon.
 */
export interface WidgetDef extends TileLook {
  kind: WidgetKind;
  name: string;
  description: string;
  icon: ComponentType<LucideProps>;
}

const META: Record<WidgetKind, { name: string; description: string; icon: ComponentType<LucideProps> }> = {
  clock: { name: "Clock", description: "Analog + digital, world time", icon: Clock },
  weather: { name: "Weather", description: "Conditions and 5-day forecast", icon: Cloud },
  system: { name: "System", description: "CPU, memory and disk load", icon: Gauge },
  calendar: { name: "Calendar", description: "Month view with events", icon: CalendarDays },
  tasks: { name: "Tasks", description: "Quick checklist with progress", icon: ListTodo },
  music: { name: "Now Playing", description: "Media controls and scrubber", icon: Music4 },
  notes: { name: "Notes", description: "Scratchpad that saves as you type", icon: StickyNote },
  pomodoro: { name: "Focus Timer", description: "Pomodoro with session streak", icon: Timer },
  markets: { name: "Markets", description: "Watchlist tickers and prices", icon: TrendingUp },
  launcher: { name: "Quick Launch", description: "Pinned apps and shortcuts", icon: LayoutGrid },
  network: { name: "Network", description: "Live throughput graph", icon: Activity },
  pet: { name: "Pet", description: "A small creature that reacts to you", icon: PawPrint },
  battery: { name: "Power", description: "Battery health and estimates", icon: BatteryCharging },
};

export const WIDGETS: WidgetDef[] = WIDGET_KINDS.map((kind) => ({
  kind,
  ...META[kind],
  ...LOOK[kind],
}));

const INDEX = new Map(WIDGETS.map((w) => [w.kind, w]));

export const byKind = (k: WidgetKind) => INDEX.get(k)!;
