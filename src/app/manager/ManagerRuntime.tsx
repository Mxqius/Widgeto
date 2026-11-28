import { useEffect, useRef } from "react";
import { useApp } from "./store";
import { useDesktopSync } from "./desktop/useDesktopSync";
import { announceUpdate, askIsland, bindTuckHotkey, useIslandSync } from "./desktop/island";
import { useManagerVisible } from "./useManagerVisible";
import { useRadioHost } from "./radio/host";
import { bindHotkey } from "./desktop/hotkeys";
import { bindCaptureHotkey } from "./desktop/captureWindow";
import { setAlwaysOnTop } from "./lib/window";
import { isTauri } from "@/shared/lib/env";
import { resolveLang, setLang } from "@/shared/i18n/locale";
import { setTrayLanguage } from "@/shared/ipc/commands";

/**
 * Everything the manager does that is not on screen: reconciling widget
 * windows, the tray menu, the capture hotkey, the update check, the radio.
 *
 * Stays mounted for the whole life of the app — including while the window is
 * parked in the tray, when the visible UI is unmounted. Renders nothing, so it
 * pulls in none of Base UI, the animation library or the board.
 */
const UPDATE_EVERY_MS = 6 * 60 * 60 * 1000;

export default function ManagerRuntime() {
  useDesktopSync();
  useIslandSync();
  useRadioHost();

  // the UI language: this window, the tray menu, and (through their configs) the
  // widget windows and the island
  const language = useApp((s) => resolveLang(s.settings.language));
  useEffect(() => {
    void setLang(language);
    void setTrayLanguage(language).catch(() => {});
  }, [language]);

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
  // update check adds its own network round trip — then look again every few
  // hours, since the app can stay up in the tray for days
  useEffect(() => {
    if (!isTauri()) return;
    const run = () => {
      const st = useApp.getState();
      // nothing to do while switched off, or while an update is already waiting
      if (!st.settings.autoUpdateEnabled || st.pendingUpdate) return;
      void st.checkForUpdates();
    };
    const first = setTimeout(run, 4000);
    const every = setInterval(run, UPDATE_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  // the update dialog only shows inside this window; while it is parked in
  // the tray, say so on the island instead — once per version per session
  const visible = useManagerVisible();
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    if (!isTauri()) return;
    const told = new Set<string>();
    return useApp.subscribe((s, prev) => {
      const v = s.pendingUpdate?.version;
      if (!v || v === prev.pendingUpdate?.version || told.has(v) || visibleRef.current) return;
      told.add(v);
      void announceUpdate(v);
    });
  }, []);

  // the capture hotkey lives with the manager, which is always running
  const captureHotkey = useApp((s) => s.settings.captureHotkey);
  useEffect(() => {
    void bindCaptureHotkey(captureHotkey);
  }, [captureHotkey]);

  // ...and so does the one that opens the island's Ask tab
  const aiHotkey = useApp((s) => s.settings.aiHotkey);
  const aiOn = useApp((s) => s.settings.aiEnabled && s.settings.island && s.settings.onboarded);
  useEffect(() => {
    void bindHotkey("ask", aiOn ? aiHotkey : "", () => void askIsland());
  }, [aiHotkey, aiOn]);

  // ...and the one that tucks the island into the top edge
  const tuckHotkey = useApp((s) => s.settings.islandTuckHotkey);
  const islandOn = useApp((s) => s.settings.island && s.settings.onboarded);
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
