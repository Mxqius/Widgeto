import type { IslandStyle, Settings } from "@/shared/types/settings";
import type { WidgetKind } from "@/shared/types/widget";
import { BUILTIN_PROFILES } from "@/app/manager/desktop/profiles";
import { WIDGETS } from "@/app/manager/widgets/catalogue";

/**
 * What the setup collects before anything is committed. The accent is the
 * exception: it is applied as it is picked, so the whole window re-tints.
 */
export interface Draft {
  picked: Set<WidgetKind>;
  clock24h: boolean;
  temperatureUnit: Settings["temperatureUnit"];
  island: boolean;
  islandStyle: IslandStyle;
  islandClipboard: boolean;
}

export type SetDraft = (patch: Partial<Draft>) => void;

export interface Preset {
  id: string;
  /** English; shown through `t` */
  name: "Work" | "Focus" | "Gaming" | "Everything";
  kinds: WidgetKind[];
}

/** The built-in profiles, plus everything at once. */
export const PRESETS: Preset[] = [
  ...BUILTIN_PROFILES.map((p) => ({ id: p.id, name: p.name as Preset["name"], kinds: p.kinds ?? [] })),
  { id: "all", name: "Everything", kinds: WIDGETS.map((w) => w.kind) },
];

/** A fresh install starts on the Work set: useful, and not all thirteen at once. */
export const STARTER = PRESETS[0].kinds;

export const sameSet = (a: Set<WidgetKind>, b: readonly WidgetKind[]) =>
  a.size === b.length && b.every((k) => a.has(k));

export const presetOf = (picked: Set<WidgetKind>) =>
  PRESETS.find((p) => sameSet(picked, p.kinds)) ?? null;
