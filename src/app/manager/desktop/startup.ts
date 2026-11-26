import { isTauri } from "@/shared/lib/env";
import { useApp } from "@/app/manager/store";

/**
 * Login-launch and tray-start. The autostart registration lives with the OS,
 * so it is read back rather than trusted from our own settings — the user may
 * have revoked it in Task Manager since.
 */
export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { isEnabled } = await import("@tauri-apps/plugin-autostart");
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function setAutostart(on: boolean): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { enable, disable } = await import("@tauri-apps/plugin-autostart");
    if (on) await enable();
    else await disable();
    return await isAutostartEnabled();
  } catch {
    return false;
  }
}

/**
 * Two preferences the Rust side needs before the UI has booted: whether to
 * hide the window, and whether to hand WebView2 its low-end device profile.
 * Browser flags are read once when the webview environment is created, which
 * happens before any window exists — so both are mirrored into a small file
 * next to the app config rather than read back out of localStorage.
 */
async function write(startInTray: boolean, lowMemory: boolean) {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_startup_prefs", { startInTray, lowMemory });
  } catch {
    /* non-fatal: the app simply opens its window at login */
  }
}

export async function setStartInTray(startInTray: boolean) {
  await write(startInTray, useApp.getState().settings.lowMemory);
}

export async function setLowMemory(lowMemory: boolean) {
  await write(useApp.getState().settings.startInTray, lowMemory);
}
