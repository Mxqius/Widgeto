import type { PersistOptions, PersistStorage, StorageValue } from "zustand/middleware";
import type { Settings } from "@/shared/types/settings";
import { DEFAULT_SETTINGS } from "@/shared/settings/defaults";
import { BUILTIN_PROFILES } from "@/app/manager/desktop/profiles";
import { DEFAULT_RADIO } from "./radioSlice";
import type { AppState } from "./types";

type Persisted = Partial<AppState>;

/** How long a burst of changes is allowed to run before it hits the disk. */
const WRITE_DELAY_MS = 250;

/**
 * `persist` serialises and writes after every single `set`. A drag through the
 * colour picker or a slider produces one `set` per pointer event, so the whole
 * store — thirteen widgets, the settings and every saved profile — was being
 * stringified and handed to localStorage dozens of times a second, all of it
 * thrown away by the next event a frame later.
 *
 * Measured on a default store this is around 0.01 ms a write, so it was never
 * the thing the picker stuttered on; it is simply pure waste, and it is the
 * part that grows, since the payload carries every profile the user saves.
 * Writes are coalesced onto a short timer instead: only the last state of a
 * burst is ever serialised, and anything still pending is flushed when the
 * window goes away so nothing is lost on quit.
 */
function coalescedStorage(): PersistStorage<Persisted> {
  const queued = new Map<string, StorageValue<Persisted>>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    for (const [name, value] of queued) {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch {
        /* quota or a locked profile — the next write will try again */
      }
    }
    queued.clear();
  };

  // `pagehide` covers the webview closing; `visibilitychange` covers the
  // manager being parked in the tray, which is where it spends most of its life
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  return {
    getItem: (name) => {
      const pending = queued.get(name);
      if (pending) return pending;
      const raw = localStorage.getItem(name);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as StorageValue<Persisted>;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      queued.set(name, value);
      if (timer === null) timer = setTimeout(flush, WRITE_DELAY_MS);
    },
    removeItem: (name) => {
      queued.delete(name);
      localStorage.removeItem(name);
    },
  };
}

/**
 * Only the manager holds the store, so this writes to plain localStorage with
 * no guard. Widget windows used to import the store too, which is why there
 * was a no-op storage adapter here — they now have no route to it at all: they
 * live behind their own entry point and the boundary check fails the build if
 * one ever reaches for `app/manager`.
 */
export const persistOptions: PersistOptions<AppState, Persisted> = {
  name: "widgeto.v3",
  version: 3,

  migrate: (persisted, from) => {
    const p = (persisted ?? {}) as Persisted & { settings?: Settings };
    if (!p.settings) return p;
    let settings = p.settings;

    // The tile redesign changed what the appearance defaults mean. Anyone
    // carrying settings from before it would otherwise keep the old purple
    // accent and small radius on top of the new flat tiles, so those four
    // fields are re-based while positions and visibility are kept.
    if (from < 2) {
      settings = {
        ...settings,
        accent: DEFAULT_SETTINGS.accent,
        radius: DEFAULT_SETTINGS.radius,
        widgetAlpha: DEFAULT_SETTINGS.widgetAlpha,
        blur: DEFAULT_SETTINGS.blur,
      };
    }

    // First-run setup arrived in v3. Anyone with saved settings already has a
    // desktop they arranged, so they skip it; only a fresh install sees it.
    if (from < 3) settings = { ...settings, onboarded: true };

    return { ...p, settings };
  },

  storage: coalescedStorage(),

  partialize: (s) => ({
    widgets: s.widgets,
    settings: s.settings,
    zTop: s.zTop,
    profiles: s.profiles,
    activeProfile: s.activeProfile,
    radio: s.radio,
  }),

  /** Heal older/partial payloads so every kind exists exactly once. */
  merge: (persisted, current) => {
    const p = (persisted ?? {}) as Persisted;
    const stored = new Map((p.widgets ?? []).map((w) => [w.kind, w]));
    return {
      ...current,
      ...p,
      settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
      widgets: current.widgets.map((base) => ({ ...base, ...(stored.get(base.kind) ?? {}) })),
      profiles: [...BUILTIN_PROFILES, ...(p.profiles ?? []).filter((x) => !x.builtin)],
      radio: { ...DEFAULT_RADIO, ...(p.radio ?? {}) },
    };
  },
};
