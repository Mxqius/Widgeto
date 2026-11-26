import { useEffect, useState } from "react";
import { isTauri } from "@/shared/lib/env";

/**
 * Whether the manager window is actually on screen.
 *
 * Driven by an explicit event from Rust rather than `document.visibilityState`:
 * the manager is hidden with `ShowWindow(SW_HIDE)` when it closes to the tray,
 * and a top-level window hidden that way is not reliably reported to the page.
 * Rust knows exactly when it hides and shows the window, so it says so.
 *
 * The one-shot `isVisible()` read covers the start-hidden case, where the
 * window was already hidden before this listener existed.
 */
export function useManagerVisible(): boolean {
  const [visible, setVisible] = useState(!isTauri());

  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    let alive = true;
    let heardEvent = false;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const off = await listen<boolean>("manager:visible", (e) => {
        heardEvent = true;
        if (alive) setVisible(e.payload);
      });
      if (!alive) {
        off();
        return;
      }
      un = off;

      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const now = await getCurrentWindow().isVisible();
      // an event that landed while we were awaiting wins over this snapshot
      if (alive && !heardEvent) setVisible(now);
    })();

    return () => {
      alive = false;
      un?.();
    };
  }, []);

  return visible;
}
