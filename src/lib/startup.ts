import { isTauri } from "./utils";

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
 * The Rust side needs to know whether to hide the window before the UI has
 * booted, so the flag is mirrored into a small file next to the app config.
 */
export async function setStartInTray(startInTray: boolean) {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_startup_prefs", { startInTray });
  } catch {
    /* non-fatal: the app simply opens its window at login */
  }
}
