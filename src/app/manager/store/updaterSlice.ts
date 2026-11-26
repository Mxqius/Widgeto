import { isTauri } from "@/shared/lib/env";
import type { Slice, UpdaterSlice } from "./types";

export const createUpdaterSlice: Slice<UpdaterSlice> = (set, get) => ({
  pendingUpdate: null,
  updateCheckStatus: "idle",

  checkForUpdates: async (opts) => {
    if (!isTauri()) return;
    set({ updateCheckStatus: "checking" });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const found = await check();
      if (!found) {
        set({ updateCheckStatus: "upToDate", pendingUpdate: null });
        return;
      }
      // an unattended check respects a version the user already skipped;
      // a manual "check now" always surfaces it
      if (!opts?.manual && found.version === get().settings.skippedUpdateVersion) {
        set({ updateCheckStatus: "upToDate" });
        return;
      }
      set({ updateCheckStatus: "idle", pendingUpdate: found });
    } catch {
      set({ updateCheckStatus: "error" });
    }
  },

  installPendingUpdate: async (onProgress) => {
    const found = get().pendingUpdate;
    if (!found) return;
    let total = 0;
    let downloaded = 0;
    await found.downloadAndInstall((event) => {
      if (event.event === "Started") total = event.data.contentLength ?? 0;
      if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        if (onProgress && total) {
          onProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        }
      }
      if (event.event === "Finished") onProgress?.(100);
    });
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  },

  dismissUpdateDialog: () => set({ pendingUpdate: null }),

  skipUpdateVersion: () => {
    const found = get().pendingUpdate;
    set({
      pendingUpdate: null,
      settings: found
        ? { ...get().settings, skippedUpdateVersion: found.version }
        : get().settings,
    });
  },
});
