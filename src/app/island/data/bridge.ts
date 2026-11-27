import { useEffect, useState } from "react";
import type { Volume } from "@/shared/ipc/commands";
import { ISLAND_EVT, type IslandConfig, type Privacy } from "@/shared/island/protocol";
import { isTauri } from "@/shared/lib/env";
import { SAMPLE_VOLUME } from "./sample";

export const DEFAULT_ISLAND_CONFIG: IslandConfig = {
  accent: "#a78bfa",
  clock24h: true,
  temperatureUnit: "C",
  reduceMotion: false,
  activities: true,
  clipboard: true,
  hideInFullscreen: true,
  style: "pill",
  align: "center",
  top: 8,
  scale: 1,
  roundness: 1,
  opacity: 1,
  earSize: 0.5,
  openOn: "hover",
  openDelay: 70,
  wheelVolume: true,
  defaultTab: "auto",
  hiddenTabs: [],
  idle: "auto",
  weatherPlace: null,
  focus: { focusMin: 25, shortMin: 5, longMin: 15 },
  ai: { provider: "claude", model: "claude-opus-5-5", baseUrl: null, hotkey: "CommandOrControl+Shift+Space" },
};

const NO_PRIVACY: Privacy = { mic: [], camera: [] };

/** Browser preview only: `island.html?align=left&scale=1.2` tries settings without the manager. */
function previewConfig(): IslandConfig {
  const cfg: Record<string, unknown> = { ...DEFAULT_ISLAND_CONFIG };
  new URLSearchParams(location.search).forEach((v, k) => {
    if (!(k in cfg)) return;
    const n = Number(v);
    cfg[k] = v === "true" ? true : v === "false" ? false : v !== "" && !Number.isNaN(n) ? n : v.includes(",") ? v.split(",") : v;
  });
  return cfg as unknown as IslandConfig;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/** Subscribe to a Tauri event for the life of the component. */
export function useTauriEvent<T>(name: string, on: (payload: T) => void) {
  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    let un: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const off = await listen<T>(name, (e) => alive && on(e.payload));
      if (alive) un = off;
      else off();
    });
    return () => {
      alive = false;
      un?.();
    };
    // the handler is expected to be stable or to only call setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
}

/**
 * The island's links to the rest of the app: config from the manager, and
 * from the native watcher hover, full-screen, volume, mic and camera use and
 * Caps Lock. Outside the app the native half is simulated, so every state can
 * be looked at in a browser.
 */
export function useIslandBridge() {
  const live = isTauri();
  const [cfg, setCfg] = useState<IslandConfig>(() => (live ? DEFAULT_ISLAND_CONFIG : previewConfig()));
  const [nativeHover, setNativeHover] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [volume, setVolume] = useState<Volume | undefined>(live ? undefined : SAMPLE_VOLUME);
  const [privacy, setPrivacy] = useState<Privacy>(NO_PRIVACY);
  const [caps, setCaps] = useState<boolean | undefined>(live ? undefined : false);

  useTauriEvent<IslandConfig>(ISLAND_EVT.config, setCfg);
  useTauriEvent<boolean>(ISLAND_EVT.hover, setNativeHover);
  useTauriEvent<boolean>(ISLAND_EVT.fullscreen, setFullscreen);
  useTauriEvent<Volume>(ISLAND_EVT.volume, setVolume);
  useTauriEvent<Privacy>(ISLAND_EVT.privacy, setPrivacy);
  useTauriEvent<boolean>(ISLAND_EVT.caps, setCaps);

  useEffect(() => {
    if (!live) return;
    // give the listeners above a beat to attach before asking for state
    const t = setTimeout(async () => {
      const { emit } = await import("@tauri-apps/api/event");
      await emit(ISLAND_EVT.hello);
      await invoke("island_ready");
    }, 60);
    return () => clearTimeout(t);
  }, [live]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", cfg.accent);
  }, [cfg.accent]);

  /** browser preview only: stand-ins for what the native watcher would send */
  const simulate = live ? null : { setVolume, setPrivacy, setCaps, setCfg };

  return { cfg, nativeHover, fullscreen, volume, privacy, caps, simulate };
}

export type Simulate = NonNullable<ReturnType<typeof useIslandBridge>["simulate"]>;
