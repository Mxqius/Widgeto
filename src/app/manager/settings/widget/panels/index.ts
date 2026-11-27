import type { ComponentType } from "react";
import type { WidgetKind } from "@/shared/types/widget";
import { ClockPanel } from "./ClockPanel";
import { WeatherPanel } from "./WeatherPanel";
import { NotesPanel } from "./NotesPanel";
import { PomodoroPanel } from "./PomodoroPanel";
import { MarketsPanel } from "./MarketsPanel";
import { CalendarPanel } from "./CalendarPanel";
import { LauncherPanel } from "./LauncherPanel";
import { PetPanel } from "./PetPanel";
import { MusicPanel } from "./MusicPanel";

/**
 * Replaces the switch this used to be. A kind with no entry simply has no
 * options — which is exactly what the old `default:` arm meant, only now
 * adding a widget cannot forget to handle it.
 */
export const KIND_PANELS: Partial<Record<WidgetKind, ComponentType<{ kind: WidgetKind }>>> = {
  clock: ClockPanel,
  weather: WeatherPanel,
  notes: NotesPanel,
  pomodoro: PomodoroPanel,
  markets: MarketsPanel,
  calendar: CalendarPanel,
  launcher: LauncherPanel,
  pet: PetPanel,
  music: MusicPanel,
};
