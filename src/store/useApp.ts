import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ArrangeMode,
  DockZone,
  Settings,
  SizeKey,
  WidgetInstance,
  WidgetKind,
} from "@/lib/types";
import { arrange, dockPosition } from "@/lib/layout";
import { BROWSER_AREA, type Area } from "@/lib/desktop";
import { WIDGET_KINDS, sizeOf } from "@/widgets/registry";
import { clamp } from "@/lib/utils";

/**
 * `index.html?w=<kind>` is a widget's own desktop window. Those windows are
 * read-only replicas: the manager owns the state and pushes it over the event
 * bus. Without this, twelve replicas would race each other writing conflicting
 * snapshots into the one shared localStorage key.
 */
export const IS_WIDGET_WINDOW =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("w");

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const DEFAULT_SETTINGS: Settings = {
  accent: "#7c6cff",
  widgetAlpha: 0.72,
  blur: 22,
  radius: 20,
  gap: 16,
  margin: 24,
  gridSize: 8,
  snapToGrid: true,
  autoDock: true,
  dockThreshold: 56,
  alignGuides: true,
  autoArrange: false,
  arrangeMode: "grid",
  lockAll: false,
  showGrid: true,
  layer: "desktop",
  managerAlwaysOnTop: false,
  reduceMotion: false,
  clock24h: true,
  temperatureUnit: "C",
  wallpaper: "aurora",
};


/**
 * The store always holds exactly one entry per widget kind. Adding and removing
 * is just flipping `open` — nothing is ever created or destroyed, so a widget
 * keeps its position and size across being hidden and shown again.
 */
function seed(): WidgetInstance[] {
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

interface AppState {
  widgets: WidgetInstance[];
  settings: Settings;
  /** work areas of every monitor; index 0 is primary */
  areas: Area[];
  zTop: number;

  setAreas: (a: Area[]) => void;

  setOpen: (kind: WidgetKind, open: boolean) => void;
  toggle: (kind: WidgetKind) => void;
  move: (kind: WidgetKind, x: number, y: number, dock?: DockZone | null) => void;
  setDisplay: (kind: WidgetKind, display: number) => void;
  setSize: (kind: WidgetKind, size: SizeKey) => void;
  cycleSize: (kind: WidgetKind) => void;
  toggleLock: (kind: WidgetKind) => void;
  focus: (kind: WidgetKind) => void;
  autoArrangeNow: (mode?: ArrangeMode) => void;
  redock: () => void;
  reset: () => void;
  closeAll: () => void;
  openAll: () => void;
  update: (patch: Partial<Settings>) => void;
}

/** Patch one widget, reusing the previous array when nothing actually changed. */
function patch(
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

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      widgets: IS_WIDGET_WINDOW ? [] : seed(),
      settings: DEFAULT_SETTINGS,
      areas: [BROWSER_AREA],
      zTop: WIDGET_KINDS.length,

      setAreas: (areas) => {
        const { areas: prev, widgets, settings } = get();
        // identical monitor layout: keep every object identity so effects that
        // depend on `widgets` do not restart on each poll
        const same =
          prev.length === areas.length &&
          prev.every(
            (p, i) =>
              p.x === areas[i].x && p.y === areas[i].y &&
              p.w === areas[i].w && p.h === areas[i].h && p.scale === areas[i].scale,
          );
        if (same) return;

        let changed = false;
        const next = widgets.map((w) => {
          const a = areas[w.display] ?? areas[0];
          if (!a) return w;
          const [ww, wh] = sizeOf(w.kind, w.size);
          let x = w.x;
          let y = w.y;
          if (w.dock) {
            const p = dockPosition(w.dock, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin);
            x = p.x;
            y = p.y;
            if (w.dock === "top" || w.dock === "bottom") {
              x = clamp(w.x, settings.margin, Math.max(settings.margin, a.w - ww - settings.margin));
            }
            if (w.dock === "left" || w.dock === "right") {
              y = clamp(w.y, settings.margin, Math.max(settings.margin, a.h - wh - settings.margin));
            }
          } else {
            x = clamp(w.x, 0, Math.max(0, a.w - ww));
            y = clamp(w.y, 0, Math.max(0, a.h - wh));
          }
          if (x === w.x && y === w.y) return w;
          changed = true;
          return { ...w, x, y };
        });

        set(changed ? { areas, widgets: next } : { areas });
      },

      setOpen: (kind, open) =>
        set({ widgets: patch(get().widgets, kind, (w) => (w.open === open ? w : { ...w, open })) }),

      toggle: (kind) =>
        set({ widgets: patch(get().widgets, kind, (w) => ({ ...w, open: !w.open })) }),

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
              if (a) Object.assign(next, dockPosition(w.dock, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin));
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

      toggleLock: (kind) =>
        set({ widgets: patch(get().widgets, kind, (w) => ({ ...w, locked: !w.locked })) }),

      focus: (kind) => {
        const z = get().zTop + 1;
        set({ zTop: z, widgets: patch(get().widgets, kind, (w) => ({ ...w, z })) });
      },

      autoArrangeNow: (mode) => {
        const { widgets, areas, settings } = get();
        const m = mode ?? settings.arrangeMode;
        const next = [...widgets];
        areas.forEach((a, di) => {
          const onThis = widgets.filter((w) => w.display === di && w.open);
          if (!onThis.length) return;
          const items = onThis.map((w) => {
            const [ww, wh] = sizeOf(w.kind, w.size);
            return { id: w.kind, w: ww, h: wh };
          });
          const pos = arrange(items, a, m, settings.gap, settings.margin);
          for (const w of onThis) {
            const i = next.findIndex((n) => n.kind === w.kind);
            next[i] = { ...next[i], ...pos[w.kind], dock: null };
          }
        });
        set({ widgets: next });
      },

      redock: () => {
        const { widgets, areas, settings } = get();
        const zones: DockZone[] = [
          "top-left", "top-right", "bottom-left", "bottom-right",
          "left", "right", "top", "bottom", "center",
        ];
        let n = 0;
        set({
          widgets: widgets.map((w) => {
            if (!w.open) return w;
            const a = areas[w.display] ?? areas[0];
            if (!a) return w;
            const [ww, wh] = sizeOf(w.kind, w.size);
            const zone = zones[n++ % zones.length];
            const p = dockPosition(zone, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin);
            return { ...w, ...p, dock: zone };
          }),
        });
      },

      reset: () => set({ widgets: seed(), zTop: WIDGET_KINDS.length, settings: DEFAULT_SETTINGS }),

      closeAll: () => set({ widgets: get().widgets.map((w) => (w.open ? { ...w, open: false } : w)) }),
      openAll: () => set({ widgets: get().widgets.map((w) => (w.open ? w : { ...w, open: true })) }),

      update: (patchIn) => set({ settings: { ...get().settings, ...patchIn } }),
    }),
    {
      name: "widgeto.v3",
      storage: createJSONStorage(() => (IS_WIDGET_WINDOW ? noopStorage : localStorage)),
      partialize: (s) => ({ widgets: s.widgets, settings: s.settings, zTop: s.zTop }),
      /** Heal older/partial payloads so every kind exists exactly once. */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const stored = new Map((p.widgets ?? []).map((w) => [w.kind, w]));
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          widgets: current.widgets.map((base) => ({ ...base, ...(stored.get(base.kind) ?? {}) })),
        };
      },
    },
  ),
);
