import { useEffect } from "react";
import { useApp } from "./store";
import { useDesktopSync } from "./desktop/useDesktopSync";
import { askIsland, bindTuckHotkey, useIslandSync } from "./desktop/island";
import { bindHotkey } from "./desktop/hotkeys";
import { bindCaptureHotkey } from "./desktop/captureWindow";
import { setAlwaysOnTop } from "./lib/window";
import { isTauri } from "@/shared/lib/env";

/**
 * Everything the manager does that is not on screen: reconciling widget
 * windows, the tray menu, the capture hotkey, the update check.
 *
 * Stays mounted for the whole life of the app — including while the window is
 * parked in the tray, when the visible UI is unmounted. Renders nothing, so it
 * pulls in none of Base UI, the animation library or the board.
 */
export default function ManagerRuntime() {
  useDesktopSync();
  useIslandSync();

  const accent = useApp((s) => s.settings.accent);
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", accent);
    r.setProperty("--accent-soft", `color-mix(in srgb, ${accent} 18%, transparent)`);
  }, [accent]);

  useEffect(() => {
    if (useApp.getState().settings.managerAlwaysOnTop) setAlwaysOnTop(true);
  }, []);

  // give startup work (tray, desktop sync, hotkeys) a head start before the
  // update check adds its own network round trip
  useEffect(() => {
    if (!isTauri() || !useApp.getState().settings.autoUpdateEnabled) return;
    const t = setTimeout(() => void useApp.getState().checkForUpdates(), 4000);
    return () => clearTimeout(t);
  }, []);

  // the capture hotkey lives with the manager, which is always running
  const captureHotkey = useApp((s) => s.settings.captureHotkey);
  useEffect(() => {
    void bindCaptureHotkey(captureHotkey);
  }, [captureHotkey]);

  // ...and so does the one that opens the island's Ask tab
  const aiHotkey = useApp((s) => s.settings.aiHotkey);
  const aiOn = useApp((s) => s.settings.aiEnabled && s.settings.island);
  useEffect(() => {
    void bindHotkey("ask", aiOn ? aiHotkey : "", () => void askIsland());
  }, [aiHotkey, aiOn]);

  // ...and the one that tucks the island into the top edge
  const tuckHotkey = useApp((s) => s.settings.islandTuckHotkey);
  const islandOn = useApp((s) => s.settings.island);
  useEffect(() => {
    void bindTuckHotkey(islandOn ? tuckHotkey : "");
  }, [tuckHotkey, islandOn]);

  // the island's "Open settings" -> remember which tab, for when the UI mounts
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    let alive = true;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const off = await listen<string>("manager:open-settings", (e) =>
        useApp.getState().requestSettings(e.payload),
      );
      if (alive) un = off;
      else off();
    });
    return () => {
      alive = false;
      un?.();
    };
  }, []);

  // tray menu -> show/hide every widget
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    let alive = true;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const off = await listen<string>("tray:widgets", (e) => {
        const st = useApp.getState();
        if (e.payload === "show_all") st.openAll();
        if (e.payload === "hide_all") st.closeAll();
      });
      if (alive) un = off;
      else off();
    })();
    return () => {
      alive = false;
      un?.();
    };
  }, []);

  return null;
}
