import { createContext, useContext, useMemo } from "react";
import type { WidgetKind } from "@/shared/types/widget";
import type { PowerSaver } from "@/shared/types/settings";
import { configOf, type ConfigOf } from "@/shared/widgets/config";

/**
 * Everything a widget body needs from the outside: the shared display
 * preferences and its own config. Passing them through a context keeps widget
 * chunks free of the zustand store.
 */
export interface WidgetPrefs {
  clock24h: boolean;
  temperatureUnit: "C" | "F";
  powerSaver: PowerSaver;
  /** pushed by the manager so each window need not ask */
  onBattery: boolean;
  lowMemory: boolean;
  config: Record<string, unknown>;
}

export const DEFAULT_PREFS: WidgetPrefs = {
  clock24h: true,
  temperatureUnit: "C",
  powerSaver: "onBattery",
  onBattery: false,
  lowMemory: false,
  config: {},
};

export const PrefsContext = createContext<WidgetPrefs>(DEFAULT_PREFS);

export const useWidgetPrefs = () => useContext(PrefsContext);

/**
 * This widget's own settings, defaults already merged in. Memoised on the
 * stored slice so the returned object keeps its identity between renders —
 * without that it is a fresh object every time and unusable as an effect
 * dependency.
 */
export function useWidgetConfig<K extends WidgetKind>(kind: K): ConfigOf<K> {
  const stored = useContext(PrefsContext).config;
  return useMemo(() => configOf(kind, stored), [kind, stored]);
}
