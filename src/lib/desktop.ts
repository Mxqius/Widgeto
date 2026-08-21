import type { DockZone, SizeKey, WidgetInstance, WidgetKind } from "./types";
import { isTauri } from "./utils";
import { sizeOf } from "@/widgets/registry";

/** Work area of a monitor, in *logical* pixels, including its screen origin. */
export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  name: string;
}

/** Fallback used in the browser so the manager still renders a plausible desktop. */
export const BROWSER_AREA: Area = { x: 0, y: 0, w: 1920, h: 1032, scale: 1, name: "Preview" };

export const labelFor = (id: string) => `w-${id}`;

/**
 * What has actually been pushed to each OS window. Shared so that a live drag
 * on the desktop map and the reconcile loop do not both issue the same move.
 */
export interface Applied {
  x: number;
  y: number;
  size: string;
  layer: string;
}
export const applied = new Map<string, Applied>();

/** Record a position we have just pushed, so reconcile treats it as done. */
export function markMoved(id: string, x: number, y: number) {
  const a = applied.get(id);
  if (a) {
    a.x = Math.round(x);
    a.y = Math.round(y);
  }
}

/**
 * Every monitor's usable area (taskbar/dock excluded), in logical pixels.
 * The primary monitor is first.
 */
export async function listAreas(): Promise<Area[]> {
  if (!isTauri()) return [BROWSER_AREA];
  const { availableMonitors, primaryMonitor } = await import("@tauri-apps/api/window");
  const [all, primary] = await Promise.all([availableMonitors(), primaryMonitor()]);
  const toArea = (m: NonNullable<Awaited<ReturnType<typeof primaryMonitor>>>): Area => ({
    x: Math.round(m.workArea.position.x / m.scaleFactor),
    y: Math.round(m.workArea.position.y / m.scaleFactor),
    w: Math.round(m.workArea.size.width / m.scaleFactor),
    h: Math.round(m.workArea.size.height / m.scaleFactor),
    scale: m.scaleFactor,
    name: m.name ?? "Display",
  });
  const areas = all.map(toArea);
  if (primary) {
    const p = toArea(primary);
    const i = areas.findIndex((a) => a.x === p.x && a.y === p.y);
    if (i > 0) areas.unshift(...areas.splice(i, 1));
  }
  return areas.length ? areas : [BROWSER_AREA];
}

/* ------------------------------------------------------------------ windows */

async function wv(label: string) {
  if (!isTauri()) return null;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  return await WebviewWindow.getByLabel(label);
}

/** Spawn the always-on-desktop window that hosts a single widget. */
export async function openWidgetWindow(w: WidgetInstance, onDesktop: boolean) {
  if (!isTauri()) return;
  const existing = await wv(labelFor(w.id));
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const [width, height] = sizeOf(w.kind, w.size);

  const win = new WebviewWindow(labelFor(w.id), {
    url: `index.html?w=${w.id}`,
    title: w.kind,
    width,
    height,
    x: w.x,
    y: w.y,
    decorations: false,
    transparent: true,
    shadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnBottom: onDesktop,
    focus: false,
    backgroundColor: "#00000000",
  });

  // wait for the window to actually exist before positioning it
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    void win.once("tauri://created", done);
    void win.once("tauri://error", done);
    setTimeout(done, 4000);
  });
}

export async function closeWidgetWindow(id: string) {
  await (await wv(labelFor(id)))?.close();
}

export async function moveWidgetWindow(id: string, x: number, y: number) {
  const win = await wv(labelFor(id));
  if (!win) return;
  const { LogicalPosition } = await import("@tauri-apps/api/dpi");
  await win.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
}

export async function resizeWidgetWindow(id: string, kind: WidgetKind, size: SizeKey) {
  const win = await wv(labelFor(id));
  if (!win) return;
  const { LogicalSize } = await import("@tauri-apps/api/dpi");
  const [w, h] = sizeOf(kind, size);
  await win.setSize(new LogicalSize(w, h));
}

/** Desktop layer: pinned behind windows, normal, or floating above everything. */
export type Layer = "desktop" | "normal" | "top";

export async function applyLayer(id: string, layer: Layer) {
  const win = await wv(labelFor(id));
  if (!win) return;
  await win.setAlwaysOnBottom(layer === "desktop");
  await win.setAlwaysOnTop(layer === "top");
}

/* ------------------------------------------------------------------- events */

export const EVT = {
  /** manager -> a widget window: your config changed */
  config: (id: string) => `widget:config:${id}`,
  /** widget window -> manager: I was dragged, here is where I landed */
  moved: "widget:moved",
  /** widget window -> manager: close me / resize me */
  action: "widget:action",
  /** manager -> widget windows: shared appearance settings changed */
  theme: "widget:theme",
  /** widget window -> manager: I am up, send me my config */
  hello: "widget:hello",
} as const;

export interface MovedPayload {
  id: string;
  x: number;
  y: number;
  dock: DockZone | null;
}

export interface ActionPayload {
  id: string;
  kind: "close" | "cycle-size" | "lock";
}
