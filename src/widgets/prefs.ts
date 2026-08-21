import { createContext, useContext } from "react";

/**
 * The only shared settings a widget body cares about. Passing them through a
 * context keeps widget chunks free of the zustand store (and everything the
 * store imports), which matters when twelve windows each parse their own copy.
 */
export interface WidgetPrefs {
  clock24h: boolean;
  temperatureUnit: "C" | "F";
}

export const DEFAULT_PREFS: WidgetPrefs = { clock24h: true, temperatureUnit: "C" };

export const PrefsContext = createContext<WidgetPrefs>(DEFAULT_PREFS);

export const useWidgetPrefs = () => useContext(PrefsContext);
