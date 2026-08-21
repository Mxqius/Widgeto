import { createContext, useContext } from "react";
import type { WidgetKind } from "@/lib/types";
import { configOf, type ConfigOf } from "./config";

/**
 * Everything a widget body needs from the outside: the shared display
 * preferences, its own config, and where the API lives. Passing them through a
 * context keeps widget chunks free of the zustand store.
 */
export interface WidgetPrefs {
  clock24h: boolean;
  temperatureUnit: "C" | "F";
  apiBase: string;
  config: Record<string, unknown>;
}

export const DEFAULT_PREFS: WidgetPrefs = {
  clock24h: true,
  temperatureUnit: "C",
  apiBase: "http://localhost:8787",
  config: {},
};

export const PrefsContext = createContext<WidgetPrefs>(DEFAULT_PREFS);

export const useWidgetPrefs = () => useContext(PrefsContext);

/** This widget's own settings, defaults already merged in. */
export function useWidgetConfig<K extends WidgetKind>(kind: K): ConfigOf<K> {
  return configOf(kind, useContext(PrefsContext).config);
}
