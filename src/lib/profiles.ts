import type { SizeKey, WidgetInstance, WidgetKind } from "./types";

/**
 * The slice of a widget a profile remembers. Config is deliberately excluded:
 * a profile changes the shape of your desktop, not the contents of your notes
 * or the cities on your weather tile.
 */
export interface ProfileEntry {
  open: boolean;
  x: number;
  y: number;
  size: SizeKey;
  display: number;
  dock: WidgetInstance["dock"];
  accent?: string;
  theme?: WidgetInstance["theme"];
}

export interface Profile {
  id: string;
  name: string;
  /** built-ins can be reset but not deleted */
  builtin?: boolean;
  /**
   * Built-ins list which widgets belong to them and let the arranger place
   * them, so they fit whatever screen they land on. Saved profiles carry
   * exact positions instead.
   */
  kinds?: WidgetKind[];
  entries?: Record<string, ProfileEntry>;
}

/** Snapshot the current desktop, exactly as it sits. */
export function snapshot(widgets: WidgetInstance[]): Record<string, ProfileEntry> {
  const out: Record<string, ProfileEntry> = {};
  for (const w of widgets) {
    out[w.kind] = {
      open: w.open,
      x: w.x,
      y: w.y,
      size: w.size,
      display: w.display,
      dock: w.dock,
      accent: w.accent,
      theme: w.theme,
    };
  }
  return out;
}

/**
 * Three starting points. They name widgets rather than pinning coordinates,
 * so applying one lays it out for the screen you actually have.
 */
export const BUILTIN_PROFILES: Profile[] = [
  {
    id: "work",
    name: "Work",
    builtin: true,
    kinds: ["clock", "calendar", "tasks", "notes", "pomodoro", "system", "launcher"],
  },
  {
    id: "focus",
    name: "Focus",
    builtin: true,
    kinds: ["pomodoro", "tasks", "clock"],
  },
  {
    id: "gaming",
    name: "Gaming",
    builtin: true,
    kinds: ["system", "network", "battery", "music", "pet"],
  },
];
