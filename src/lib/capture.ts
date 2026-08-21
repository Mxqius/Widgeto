import { isTauri } from "./utils";

const LABEL = "capture";

/** Show the quick-capture bar, creating its window the first time. */
export async function openCapture() {
  if (!isTauri()) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");

  const existing = await WebviewWindow.getByLabel(LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const win = new WebviewWindow(LABEL, {
    url: "index.html?capture=1",
    width: 460,
    height: 96,
    center: true,
    decorations: false,
    transparent: true,
    shadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focus: true,
    backgroundColor: "#00000000",
  });
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    void win.once("tauri://created", done);
    void win.once("tauri://error", done);
    setTimeout(done, 3000);
  });
  await win.setFocus();
}

/**
 * (Re)bind the capture hotkey. Everything is unregistered first because the
 * user can change the combination, and a stale binding would keep firing.
 */
export async function bindCaptureHotkey(accelerator: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { register, unregisterAll } = await import("@tauri-apps/plugin-global-shortcut");
    await unregisterAll();
    if (!accelerator.trim()) return false;
    await register(accelerator, (event) => {
      // the plugin fires for press and release; only act once
      if (event.state === "Pressed") void openCapture();
    });
    return true;
  } catch {
    // the combination may already be owned by another app
    return false;
  }
}
