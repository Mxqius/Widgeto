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
