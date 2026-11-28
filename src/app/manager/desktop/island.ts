import { useEffect, useMemo, useRef, useState } from "react";
import type { Settings } from "@/shared/types/settings";
import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import { ISLAND_EVT, ISLAND_LABEL, ISLAND_WINDOW, type IslandConfig } from "@/shared/island/protocol";
import { isTauri } from "@/shared/lib/env";
import { resolveLang } from "@/shared/i18n/locale";
import { bindHotkey } from "./hotkeys";

/**
 * Create the island window at the top centre of the primary display. The
 * window is the size of the island's largest shape and transparent around it;
 * the native watcher makes everything but the island itself click-through.
 */
async function openIsland() {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  if (await WebviewWindow.getByLabel(ISLAND_LABEL)) return;

  const { primaryMonitor } = await import("@tauri-apps/api/window");
  const m = await primaryMonitor();
  const scale = m?.scaleFactor ?? 1;
  const mx = m ? m.position.x / scale : 0;
  const my = m ? m.position.y / scale : 0;
  const mw = m ? m.size.width / scale : 1920;

  const win = new WebviewWindow(ISLAND_LABEL, {
    url: "island.html",
    title: "Widgeto Island",
    x: Math.round(mx + (mw - ISLAND_WINDOW.width) / 2),
    y: Math.round(my),
    width: ISLAND_WINDOW.width,
    height: ISLAND_WINDOW.height,
    decorations: false,
    transparent: true,
    shadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focus: false,
    backgroundColor: "#00000000",
  });
  await new Promise<void>((done) => {
    void win.once("tauri://created", () => done());
    void win.once("tauri://error", () => done());
  });
}

type Placement = Pick<Settings, "islandMonitor" | "islandAlign" | "islandOffsetX">;

/**
 * Move the island's window to the chosen monitor and side. Worked out in
 * physical pixels against the target monitor's own scale, so it lands right
 * on mixed-DPI setups; Windows resizes the window itself when it crosses over.
 */
async function placeIsland(p: Placement) {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const win = await WebviewWindow.getByLabel(ISLAND_LABEL);
  if (!win) return;
  const { availableMonitors, primaryMonitor } = await import("@tauri-apps/api/window");
  const { PhysicalPosition } = await import("@tauri-apps/api/dpi");
  const [all, primary] = await Promise.all([availableMonitors(), primaryMonitor()]);
  const m = (p.islandMonitor && all.find((x) => x.name === p.islandMonitor)) || primary || all[0];
  if (!m) return;
  const s = m.scaleFactor;
  const mw = m.size.width;
  const w = ISLAND_WINDOW.width * s;
  const off = p.islandOffsetX * s;
  const base =
    p.islandAlign === "left" ? 0 : p.islandAlign === "right" ? mw - w : (mw - w) / 2;
  const x = m.position.x + Math.min(Math.max(base + off, 0), Math.max(0, mw - w));
  await win.setPosition(new PhysicalPosition(Math.round(x), m.position.y));
}

/** Everything the island page needs, from the manager's settings. */
function islandConfig(
  st: Settings,
  weatherCfg: Record<string, unknown> | undefined,
  focusCfg: Record<string, unknown> | undefined,
): IslandConfig {
  const weather = configOf("weather", weatherCfg);
  const pomo = configOf("pomodoro", focusCfg);
  return {
    language: resolveLang(st.language),
    accent: st.accent,
    clock24h: st.clock24h,
    temperatureUnit: st.temperatureUnit,
    reduceMotion: st.reduceMotion,
    activities: st.islandActivities,
    clipboard: st.islandClipboard,
    hideInFullscreen: st.islandHideFullscreen,
    style: st.islandStyle,
    align: st.islandAlign,
    top: st.islandTop,
    scale: st.islandScale,
    roundness: st.islandRoundness,
    opacity: st.islandOpacity,
    earSize: st.islandEarSize,
    openOn: st.islandOpenOn,
    openDelay: st.islandOpenDelay,
    wheelVolume: st.islandWheelVolume,
    defaultTab: st.islandDefaultTab,
    hiddenTabs: st.islandHiddenTabs,
    idle: st.islandIdle,
    weatherPlace: weather.place?.trim() || null,
    focus: { focusMin: pomo.focusMin, shortMin: pomo.shortMin, longMin: pomo.longMin },
    ai: st.aiEnabled
      ? {
          provider: st.aiProvider,
          model: st.aiModels[st.aiProvider] ?? "",
          baseUrl: st.aiProvider === "claude" ? null : st.aiBaseUrls[st.aiProvider] || null,
          hotkey: st.aiHotkey,
        }
      : null,
  };
}

/** The Ask hotkey: open the island on its Ask tab, ready to type. */
export async function askIsland() {
  const { emitTo } = await import("@tauri-apps/api/event");
  const st = useApp.getState().settings;
  if (!st.island || !st.onboarded || !st.aiEnabled) return;
  await emitTo(ISLAND_LABEL, ISLAND_EVT.ask, null).catch(() => {});
}

/** The tuck hotkey: fold the island into the top edge, or bring it back. */
export async function toggleIslandTuck() {
  const { emitTo } = await import("@tauri-apps/api/event");
  const st = useApp.getState().settings;
  if (!st.island || !st.onboarded) return;
  await emitTo(ISLAND_LABEL, ISLAND_EVT.tuck, null).catch(() => {});
}

/**
 * Tell the island a new version is ready. The update dialog lives in the
 * manager, which is usually parked in the tray, so without this nobody would
 * hear about an update until they happened to open it.
 */
export async function announceUpdate(version: string) {
  const { emitTo } = await import("@tauri-apps/api/event");
  const st = useApp.getState().settings;
  if (!st.island || !st.onboarded) return;
  await emitTo(ISLAND_LABEL, ISLAND_EVT.update, version).catch(() => {});
}

/** (Re)bind the tuck hotkey. */
export const bindTuckHotkey = (accelerator: string) =>
  bindHotkey("tuck", accelerator, () => void toggleIslandTuck());

async function closeIsland() {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const w = await WebviewWindow.getByLabel(ISLAND_LABEL);
  await w?.close();
}

/**
 * Keeps the island window in step with settings: opens or closes it, places
 * it on the chosen monitor and side, and pushes it a fresh config whenever
 * something it shows changes — and again whenever it says hello, so a
 * reloaded island is never left on defaults.
 */
export function useIslandSync() {
  const settings = useApp((s) => s.settings);
  // held back until first-run setup is done, along with the widgets
  const enabled = settings.island && settings.onboarded;
  const weatherCfg = useApp((s) => s.widgets.find((w) => w.kind === "weather")?.config);
  const focusCfg = useApp((s) => s.widgets.find((w) => w.kind === "pomodoro")?.config);
  // a monitor plugged in or out may move the island's home
  const screens = useApp((s) => s.areas.map((a) => `${a.name}@${a.x},${a.y},${a.w}`).join("|"));

  const cfg = useMemo(
    () => islandConfig(settings, weatherCfg, focusCfg),
    [settings, weatherCfg, focusCfg],
  );
  // settings unrelated to the island change the object, not the payload
  const sig = JSON.stringify(cfg);

  const latest = useRef(cfg);
  latest.current = cfg;

  const { islandMonitor, islandAlign, islandOffsetX } = settings;
  // placing waits for the window to exist
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    void (enabled ? openIsland() : closeIsland())
      .then(() => alive && setOpened(enabled))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled, setOpened]);

  useEffect(() => {
    if (!isTauri() || !enabled || !opened) return;
    void placeIsland({ islandMonitor, islandAlign, islandOffsetX }).catch(() => {});
  }, [enabled, opened, islandMonitor, islandAlign, islandOffsetX, screens]);

  useEffect(() => {
    if (!isTauri() || !enabled) return;
    void import("@tauri-apps/api/event").then(({ emitTo }) =>
      emitTo(ISLAND_LABEL, ISLAND_EVT.config, latest.current).catch(() => {}),
    );
  }, [sig, enabled]);

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    let un: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen, emitTo }) => {
      const off = await listen(ISLAND_EVT.hello, () => {
        void emitTo(ISLAND_LABEL, ISLAND_EVT.config, latest.current).catch(() => {});
      });
      if (alive) un = off;
      else off();
    });
    return () => {
      alive = false;
      un?.();
    };
  }, []);
}
