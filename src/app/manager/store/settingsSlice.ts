import { DEFAULT_SETTINGS } from "@/shared/settings/defaults";
import type { SettingsSlice, Slice } from "./types";

export const createSettingsSlice: Slice<SettingsSlice> = (set, get) => ({
  settings: DEFAULT_SETTINGS,
  update: (patchIn) => set({ settings: { ...get().settings, ...patchIn } }),
});
