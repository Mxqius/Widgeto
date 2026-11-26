import { isTauri } from "@/shared/lib/env";

/**
 * Thin, lazily-imported bridge to the Tauri window APIs so the whole app
 * still runs in a plain browser tab (`npm run dev`) for fast iteration.
 */
async function win() {
  if (!isTauri()) return null;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export async function winMinimize() {
  (await win())?.minimize();
}

export async function winToggleMax() {
  const w = await win();
  if (!w) return;
  (await w.isMaximized()) ? w.unmaximize() : w.maximize();
}

export async function winClose() {
  (await win())?.close();
}

export async function setAlwaysOnTop(on: boolean) {
  (await win())?.setAlwaysOnTop(on);
}

export async function openExternal(url: string) {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
