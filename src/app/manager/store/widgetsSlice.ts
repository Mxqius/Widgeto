import type { SizeKey, WidgetInstance, WidgetKind } from "@/shared/types/widget";
import { BROWSER_AREA } from "@/shared/desktop/area";
import { WIDGET_KINDS, sizeOf } from "@/shared/widgets/kinds";
import { dockPosition } from "@/shared/layout/snap";
import { DEFAULT_SETTINGS } from "@/shared/settings/defaults";
import type { Slice, WidgetsSlice } from "./types";

/**
 * The store always holds exactly one entry per widget kind. Adding and removing
 * is just flipping `open` — nothing is ever created or destroyed, so a widget
 * keeps its position and size across being hidden and shown again.
 */
export function seed(): WidgetInstance[] {
  const out: WidgetInstance[] = [];
  let x = 24;
  let y = 24;
  let rowH = 0;
  WIDGET_KINDS.forEach((kind, i) => {
    const [w, h] = sizeOf(kind, "md");
    if (x + w > BROWSER_AREA.w - 24) {
      x = 24;
      y += rowH + 16;
      rowH = 0;
    }
    out.push({
      kind,
      size: "md",
      x,
      y,
      z: i + 1,
      locked: false,
      dock: null,
      alpha: 1,
      open: true,
      display: 0,
    });
    x += w + 16;
    rowH = Math.max(rowH, h);
  });
  return out;
}

/** Patch one widget, reusing the previous array when nothing actually changed. */
export function patch(
  widgets: WidgetInstance[],
  kind: WidgetKind,
  fn: (w: WidgetInstance) => WidgetInstance,
) {
  let changed = false;
  const next = widgets.map((w) => {
    if (w.kind !== kind) return w;
    const n = fn(w);
    if (n !== w) changed = true;
    return n;
  });
  return changed ? next : widgets;
}

/**
 * Spread a patch over a widget, returning the *same* object when every field
 * in the patch already holds that value. The colour picker and the sliders
 * happily re-send a value they have already sent, and without this each repeat
 * still allocated a new widget, a new array and a re-render of everything
 * watching the store.
 */
function merged(w: WidgetInstance, over: Partial<WidgetInstance>): WidgetInstance {
  for (const k of Object.keys(over) as (keyof WidgetInstance)[]) {
    if (over[k] !== w[k]) return { ...w, ...over };
  }
  return w;
}

export const createWidgetsSlice: Slice<WidgetsSlice> = (set, get) => ({
  widgets: seed(),
  zTop: WIDGET_KINDS.length,

  setOpen: (kind, open) =>
    set({ widgets: patch(get().widgets, kind, (w) => (w.open === open ? w : { ...w, open })) }),

  toggle: (kind) => set({ widgets: patch(get().widgets, kind, (w) => ({ ...w, open: !w.open })) }),

  move: (kind, x, y, dock = null) =>
    set({
      widgets: patch(get().widgets, kind, (w) =>
        w.x === x && w.y === y && w.dock === dock ? w : { ...w, x, y, dock },
      ),
    }),

  setDisplay: (kind, display) =>
    set({ widgets: patch(get().widgets, kind, (w) => ({ ...w, display, dock: null })) }),

  setSize: (kind, size) => {
    const { settings, areas } = get();
    set({
      widgets: patch(get().widgets, kind, (w) => {
        if (w.size === size) return w;
        const next = { ...w, size };
        if (w.dock) {
          const a = areas[w.display] ?? areas[0];
          const [ww, wh] = sizeOf(w.kind, size);
          if (a) {
            Object.assign(
              next,
              dockPosition(w.dock, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin),
            );
          }
        }
        return next;
      }),
    });
    if (settings.autoArrange) get().autoArrangeNow();
  },

  cycleSize: (kind) => {
    const order: SizeKey[] = ["sm", "md", "lg"];
    const w = get().widgets.find((i) => i.kind === kind);
    if (!w) return;
    get().setSize(kind, order[(order.indexOf(w.size) + 1) % order.length]);
  },

  toggleLock: (kind) => {
    const { settings, widgets } = get();
    if (settings.lockAll) {
      // "lock all" is on, so flipping this widget's own flag would change
      // nothing anyone can see. Unlock just this one: the others keep their
      // lock as individual locks.
      set({
        settings: { ...settings, lockAll: false },
        widgets: widgets.map((w) =>
          w.kind === kind ? { ...w, locked: false } : w.locked ? w : { ...w, locked: true },
        ),
      });
      return;
    }
    set({ widgets: patch(widgets, kind, (w) => ({ ...w, locked: !w.locked })) });
  },

  setAppearance: (kind, patchIn) =>
    set({ widgets: patch(get().widgets, kind, (w) => merged(w, patchIn)) }),

  setConfig: (kind, patchIn) =>
    set({
      widgets: patch(get().widgets, kind, (w) => {
        const config = w.config;
        if (config && Object.keys(patchIn).every((k) => config[k] === patchIn[k])) return w;
        return { ...w, config: { ...(config ?? {}), ...patchIn } };
      }),
    }),

  focus: (kind) => {
    const z = get().zTop + 1;
    set({ zTop: z, widgets: patch(get().widgets, kind, (w) => ({ ...w, z })) });
  },

  // a reset starts the desktop over, not the first-run setup
  reset: () =>
    set({
      widgets: seed(),
      zTop: WIDGET_KINDS.length,
      settings: { ...DEFAULT_SETTINGS, onboarded: get().settings.onboarded },
    }),

  closeAll: () =>
    set({ widgets: get().widgets.map((w) => (w.open ? { ...w, open: false } : w)) }),
  openAll: () => set({ widgets: get().widgets.map((w) => (w.open ? w : { ...w, open: true })) }),
});
