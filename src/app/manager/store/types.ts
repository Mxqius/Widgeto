import type { StateCreator } from "zustand";
import type { Update } from "@tauri-apps/plugin-updater";
import type { ArrangeMode, DockZone } from "@/shared/types/geometry";
import type { Settings } from "@/shared/types/settings";
import type { SizeKey, WidgetInstance, WidgetKind } from "@/shared/types/widget";
import type { Area } from "@/shared/desktop/area";
import type { Profile } from "@/app/manager/desktop/profiles";
import type { Station } from "@/shared/radio/protocol";

export interface WidgetsSlice {
  widgets: WidgetInstance[];
  zTop: number;

  setOpen: (kind: WidgetKind, open: boolean) => void;
  toggle: (kind: WidgetKind) => void;
  move: (kind: WidgetKind, x: number, y: number, dock?: DockZone | null) => void;
  setDisplay: (kind: WidgetKind, display: number) => void;
  setSize: (kind: WidgetKind, size: SizeKey) => void;
  cycleSize: (kind: WidgetKind) => void;
  toggleLock: (kind: WidgetKind) => void;
  setConfig: (kind: WidgetKind, patch: Record<string, unknown>) => void;
  setAppearance: (kind: WidgetKind, patch: Partial<Pick<WidgetInstance, "accent" | "theme">>) => void;
  focus: (kind: WidgetKind) => void;
  reset: () => void;
  closeAll: () => void;
  openAll: () => void;
}

export interface MonitorsSlice {
  /** work areas of every monitor; index 0 is primary */
  areas: Area[];
  setAreas: (a: Area[]) => void;
  autoArrangeNow: (mode?: ArrangeMode) => void;
  redock: () => void;
}

export interface SettingsSlice {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** a settings tab someone outside the UI asked for (the island); not persisted */
  settingsRequest: { tab: string; n: number } | null;
  requestSettings: (tab: string) => void;
  clearSettingsRequest: () => void;
  /** the welcome tour was asked for again from Settings → About; not persisted */
  onboardingReplay: boolean;
  setOnboardingReplay: (on: boolean) => void;
}

export interface UpdaterSlice {
  /** the update found by the last check, if any; drives the update dialog */
  pendingUpdate: Update | null;
  updateCheckStatus: "idle" | "checking" | "upToDate" | "error";
  checkForUpdates: (opts?: { manual?: boolean }) => Promise<void>;
  installPendingUpdate: (onProgress?: (pct: number) => void) => Promise<void>;
  dismissUpdateDialog: () => void;
  skipUpdateVersion: () => void;
}

export interface ProfilesSlice {
  profiles: Profile[];
  activeProfile: string | null;
  applyProfile: (id: string) => void;
  saveProfile: (name: string) => string;
  updateProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
}

/** What the radio remembers between runs; what is playing right now lives in the player. */
export interface RadioPrefs {
  favorites: Station[];
  /** the station last played, offered again by Play after a restart */
  last: Station | null;
  /** 0 – 1 */
  volume: number;
}

export interface RadioSlice {
  radio: RadioPrefs;
  setRadio: (patch: Partial<RadioPrefs>) => void;
}

export type AppState = WidgetsSlice &
  MonitorsSlice &
  SettingsSlice &
  UpdaterSlice &
  ProfilesSlice &
  RadioSlice;

/**
 * Every slice is typed against the whole state, so cross-slice `get()` calls —
 * `setSize` reaching for `autoArrangeNow`, `applyProfile` for the arranger —
 * stay type-safe. The middleware tuple has to name `persist` or the `set`/`get`
 * signatures the slices receive will not line up with the composed store.
 */
export type Slice<T> = StateCreator<AppState, [["zustand/persist", unknown]], [], T>;
