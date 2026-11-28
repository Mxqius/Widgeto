import { useEffect, useRef } from "react";
import { isTauri } from "@/shared/lib/env";

/**
 * Listen to an app-wide Tauri event for as long as the widget is mounted. The
 * handler may change between renders without re-subscribing.
 */
export function useTauriEvent<T>(name: string, on: (payload: T) => void) {
  const handler = useRef(on);
  handler.current = on;

  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    let alive = true;
    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const off = await listen<T>(name, (e) => handler.current(e.payload));
      // the widget may already be gone by the time listen() resolves
      if (alive) un = off;
      else off();
    })();
    return () => {
      alive = false;
      un?.();
    };
  }, [name]);
}

/** Fire an app-wide Tauri event; a no-op in the browser preview. */
export async function emitTauri(name: string, payload?: unknown) {
  if (!isTauri()) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit(name, payload);
}
