import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createWidgetsSlice } from "./widgetsSlice";
import { createMonitorsSlice } from "./monitorsSlice";
import { createSettingsSlice } from "./settingsSlice";
import { createUpdaterSlice } from "./updaterSlice";
import { createProfilesSlice } from "./profilesSlice";
import { createRadioSlice } from "./radioSlice";
import { persistOptions } from "./persist";
import type { AppState } from "./types";

export type { AppState } from "./types";
export { DEFAULT_SETTINGS } from "@/shared/settings/defaults";
export { seed } from "./widgetsSlice";

/**
 * Manager-only. Six slices over one persisted store: widgets, monitors,
 * settings, the updater, profiles and the radio. They are composed rather than nested so
 * cross-slice calls stay direct `get()` lookups.
 */
export const useApp = create<AppState>()(
  persist(
    (...a) => ({
      ...createWidgetsSlice(...a),
      ...createMonitorsSlice(...a),
      ...createSettingsSlice(...a),
      ...createUpdaterSlice(...a),
      ...createProfilesSlice(...a),
      ...createRadioSlice(...a),
    }),
    persistOptions,
  ),
);

// Dev-only handle so the store can be inspected from the console.
if (import.meta.env.DEV) {
  (window as unknown as { __widgeto: unknown }).__widgeto = useApp;
}
