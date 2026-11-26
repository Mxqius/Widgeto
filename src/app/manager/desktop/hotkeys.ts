import { isTauri } from "@/shared/lib/env";

/**
 * Global shortcuts, one per slot. Each slot remembers its own combination so
 * rebinding one never drops another; everything left over from a previous
 * page load is cleared once, before the first binding.
 */
export type HotkeySlot = "capture" | "ask" | "tuck";

const bound = new Map<HotkeySlot, string>();
let cleared: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();

export function bindHotkey(slot: HotkeySlot, accelerator: string, run: () => void): Promise<boolean> {
  if (!isTauri()) return Promise.resolve(false);
  // serialised: two slots binding at startup must not race the clear-out
  const next = queue.then(async () => {
    try {
      const gs = await import("@tauri-apps/plugin-global-shortcut");
      cleared ??= gs.unregisterAll().catch(() => {});
      await cleared;

      const prev = bound.get(slot);
      if (prev) {
        bound.delete(slot);
        await gs.unregister(prev).catch(() => {});
      }
      const accel = accelerator.trim();
      if (!accel) return false;
      await gs.register(accel, (event) => {
        // the plugin fires for press and release; only act once
        if (event.state === "Pressed") run();
      });
      bound.set(slot, accel);
      return true;
    } catch {
      // the combination may already be owned by another app, or by the other slot
      return false;
    }
  });
  queue = next;
  return next;
}
