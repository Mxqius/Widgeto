import { isTauri } from "@/shared/lib/env";
import { bindHotkey } from "./hotkeys";

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
    url: "capture.html",
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

/** (Re)bind the capture hotkey. */
export const bindCaptureHotkey = (accelerator: string) => bindHotkey("capture", accelerator, () => void openCapture());
