import type { SizeKey, WidgetInstance, WidgetKind } from "@/shared/types/widget";
import { labelFor } from "@/shared/desktop/protocol";
import type { Area } from "@/shared/desktop/area";
import { BROWSER_AREA } from "@/shared/desktop/area";
import { sizeOf } from "@/shared/widgets/kinds";
import { isTauri } from "@/shared/lib/env";
import { lerp } from "@/shared/lib/math";
import { easeOutExpo } from "@/shared/lib/motion";

/**
 * What has actually been pushed to each OS window. Shared so that a live drag
 * on the desktop map and the reconcile loop do not both issue the same move.
 */
export interface Applied {
  x: number;
  y: number;
  size: string;
  layer: string;
  display: number;
}
export const applied = new Map<WidgetKind, Applied>();

/** Record a position we have just pushed, so reconcile treats it as done. */
export function markMoved(kind: WidgetKind, x: number, y: number) {
  const a = applied.get(kind);
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

async function wv(label: string) {
  if (!isTauri()) return null;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  return await WebviewWindow.getByLabel(label);
}

/**
 * Spawn the always-on-desktop window that hosts a single widget.
 *
 * `widget.html` rather than the manager's `index.html`: a separate entry keeps
 * the manager's tree — Base UI, the animation library, the store — out of the
 * bundle graph a widget window loads, and makes it impossible to reintroduce
 * by accident.
 */
export async function openWidgetWindow(w: WidgetInstance, onDesktop: boolean) {
  if (!isTauri()) return;
  const existing = await wv(labelFor(w.kind));
  if (existing) {
    await existing.show();
    return;
  }
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const [width, height] = sizeOf(w.kind, w.size);

  const win = new WebviewWindow(labelFor(w.kind), {
    url: `widget.html?w=${w.kind}`,
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

/**
 * Tears the window down rather than hiding it, so a widget the user has turned
 * off costs nothing — no frame, no DOM, no timers, no JS heap.
 */
export async function closeWidgetWindow(kind: WidgetKind) {
  await (await wv(labelFor(kind)))?.close();
}

/** In-flight glides, one per window, so a new target cancels the old one. */
const glides = new Map<WidgetKind, number>();

/** How long a widget takes to travel to a position it was given, not dragged. */
const GLIDE_MS = 320;
/** Below this a tween is pointless — just place the window. */
const GLIDE_MIN_PX = 3;

/**
 * Move a widget's window.
 *
 * Docking, auto-arrange and a monitor coming or going all rewrite several
 * positions at once, and jumping every window to its new spot in a single
 * frame reads as a glitch rather than a layout. `animate` glides instead: an
 * ease-out tween per window, all running off the same clock, so a redock looks
 * like the widgets flying into their zones. Drags never use it — they are
 * already smoothed by the widget's own loop, and a second easing on top would
 * just feel like lag.
 */
export async function moveWidgetWindow(kind: WidgetKind, x: number, y: number, animate = false) {
  const win = await wv(labelFor(kind));
  if (!win) return;
  const { LogicalPosition } = await import("@tauri-apps/api/dpi");

  const running = glides.get(kind);
  if (running !== undefined) {
    cancelAnimationFrame(running);
    glides.delete(kind);
  }

  const to = { x: Math.round(x), y: Math.round(y) };
  const place = async (p: { x: number; y: number }) =>
    win.setPosition(new LogicalPosition(Math.round(p.x), Math.round(p.y)));

  if (!animate) {
    await place(to);
    return;
  }

  const [pos, scale] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
  const from = { x: pos.x / scale, y: pos.y / scale };
  if (Math.hypot(to.x - from.x, to.y - from.y) < GLIDE_MIN_PX) {
    await place(to);
    return;
  }

  const started = performance.now();
  await new Promise<void>((resolve) => {
    const step = () => {
      const t = Math.min(1, (performance.now() - started) / GLIDE_MS);
      const k = easeOutExpo(t);
      void place({ x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) });
      if (t >= 1) {
        glides.delete(kind);
        resolve();
        return;
      }
      glides.set(kind, requestAnimationFrame(step));
    };
    glides.set(kind, requestAnimationFrame(step));
  });
}

export async function resizeWidgetWindow(kind: WidgetKind, size: SizeKey) {
  const win = await wv(labelFor(kind));
  if (!win) return;
  const { LogicalSize } = await import("@tauri-apps/api/dpi");
  const [w, h] = sizeOf(kind, size);
  await win.setSize(new LogicalSize(w, h));
}

/** Desktop layer: pinned behind windows, normal, or floating above everything. */
export type Layer = "desktop" | "normal" | "top";

export async function applyLayer(kind: WidgetKind, layer: Layer) {
  const win = await wv(labelFor(kind));
  if (!win) return;
  await win.setAlwaysOnBottom(layer === "desktop");
  await win.setAlwaysOnTop(layer === "top");
}
