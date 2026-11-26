import { useEffect, useState } from "react";
import { ISLAND_EVT, type IslandConfig } from "@/shared/island/protocol";
import { isTauri } from "@/shared/lib/env";

export const DEFAULT_ISLAND_CONFIG: IslandConfig = {
  accent: "#a78bfa",
  clock24h: true,
  temperatureUnit: "C",
  reduceMotion: false,
  activities: true,
  hideInFullscreen: true,
  weatherPlace: null,
  focus: { focusMin: 25, shortMin: 5, longMin: 15 },
};

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
 * hover and full-screen state from the native watcher.
 */
export function useIslandBridge() {
  const [cfg, setCfg] = useState<IslandConfig>(DEFAULT_ISLAND_CONFIG);
  const [nativeHover, setNativeHover] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useTauriEvent<IslandConfig>(ISLAND_EVT.config, setCfg);
  useTauriEvent<boolean>(ISLAND_EVT.hover, setNativeHover);
  useTauriEvent<boolean>(ISLAND_EVT.fullscreen, setFullscreen);

  useEffect(() => {
    if (!isTauri()) return;
    // give the listeners above a beat to attach before asking for state
    const t = setTimeout(async () => {
      const { emit } = await import("@tauri-apps/api/event");
      await emit(ISLAND_EVT.hello);
      await invoke("island_ready");
    }, 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", cfg.accent);
  }, [cfg.accent]);

  return { cfg, nativeHover, fullscreen };
}
