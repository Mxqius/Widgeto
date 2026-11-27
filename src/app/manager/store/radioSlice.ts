import type { RadioPrefs, RadioSlice, Slice } from "./types";

export const DEFAULT_RADIO: RadioPrefs = { favorites: [], last: null, volume: 0.8 };

export const createRadioSlice: Slice<RadioSlice> = (set, get) => ({
  radio: DEFAULT_RADIO,
  setRadio: (patch) => set({ radio: { ...get().radio, ...patch } }),
});
