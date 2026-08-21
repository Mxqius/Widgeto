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
import { sizeOf } from "@/widgets/registry";
import { clamp, uid } from "@/lib/utils";

/**
 * `index.html?w=<id>` is a widget's own desktop window. Those windows are
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

const STARTER: WidgetKind[] = [
  "clock", "weather", "system", "music",
  "tasks", "calendar", "pomodoro", "markets",
  "notes", "network", "battery", "launcher",
];

/** Lay the starter set out in reading order across a 1920x1032 work area. */
function seed(): WidgetInstance[] {
  const out: WidgetInstance[] = [];
  let x = 24;
  let y = 24;
  let rowH = 0;
  STARTER.forEach((kind, i) => {
    const [w, h] = sizeOf(kind, "md");
    if (x + w > BROWSER_AREA.w - 24) {
      x = 24;
      y += rowH + 16;
      rowH = 0;
    }
    out.push({
      id: uid(),
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
  activeId: string | null;
  zTop: number;

  setAreas: (a: Area[]) => void;
  areaOf: (w: WidgetInstance) => Area;

  add: (kind: WidgetKind) => string;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  setOpen: (id: string, open: boolean) => void;
  move: (id: string, x: number, y: number, dock?: DockZone | null) => void;
  setDisplay: (id: string, display: number) => void;
  setSize: (id: string, size: SizeKey) => void;
  cycleSize: (id: string) => void;
  setAlpha: (id: string, a: number) => void;
  toggleLock: (id: string) => void;
  focus: (id: string) => void;
  autoArrangeNow: (mode?: ArrangeMode) => void;
  redock: () => void;
  reset: () => void;
  closeAll: () => void;
  openAll: () => void;
  update: (patch: Partial<Settings>) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      widgets: IS_WIDGET_WINDOW ? [] : seed(),
      settings: DEFAULT_SETTINGS,
      areas: [BROWSER_AREA],
      activeId: null,
      zTop: STARTER.length,

      areaOf: (w) => get().areas[w.display] ?? get().areas[0] ?? BROWSER_AREA,

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

      add: (kind) => {
        const { widgets, zTop, areas, settings } = get();
        const [w, h] = sizeOf(kind, "md");
        const a = areas[0] ?? BROWSER_AREA;
        const z = zTop + 1;
        const id = uid();
        const spot = findFreeSpot(widgets, { w, h }, a, settings.margin, settings.gap);
        set({
          zTop: z,
          widgets: [
            ...widgets,
            { id, kind, size: "md", x: spot.x, y: spot.y, z, locked: false, dock: null, alpha: 1, open: true, display: 0 },
          ],
        });
        if (settings.autoArrange) get().autoArrangeNow();
        return id;
      },

      remove: (id) => set({ widgets: get().widgets.filter((w) => w.id !== id) }),

      duplicate: (id) => {
        const src = get().widgets.find((w) => w.id === id);
        if (!src) return;
        const z = get().zTop + 1;
        set({
          zTop: z,
          widgets: [
            ...get().widgets,
            { ...src, id: uid(), x: src.x + 28, y: src.y + 28, z, dock: null },
          ],
        });
      },

      setOpen: (id, open) =>
        set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, open } : w)) }),

      move: (id, x, y, dock = null) =>
        set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, x, y, dock } : w)) }),

      setDisplay: (id, display) =>
        set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, display, dock: null } : w)) }),

      setSize: (id, size) => {
        set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, size } : w)) });
        const { settings } = get();
        const w = get().widgets.find((i) => i.id === id);
        if (w?.dock) {
          const a = get().areaOf(w);
          const [ww, wh] = sizeOf(w.kind, w.size);
          const p = dockPosition(w.dock, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin);
          set({ widgets: get().widgets.map((i) => (i.id === id ? { ...i, ...p } : i)) });
        }
        if (settings.autoArrange) get().autoArrangeNow();
      },

      cycleSize: (id) => {
        const order: SizeKey[] = ["sm", "md", "lg"];
        const w = get().widgets.find((i) => i.id === id);
        if (!w) return;
        get().setSize(id, order[(order.indexOf(w.size) + 1) % order.length]);
      },

      setAlpha: (id, a) =>
        set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, alpha: a } : w)) }),

      toggleLock: (id) =>
        set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, locked: !w.locked } : w)) }),

      focus: (id) => {
        const z = get().zTop + 1;
        set({
          zTop: z,
          activeId: id,
          widgets: get().widgets.map((w) => (w.id === id ? { ...w, z } : w)),
        });
      },

      autoArrangeNow: (mode) => {
        const { widgets, areas, settings } = get();
        const m = mode ?? settings.arrangeMode;
        // pack each display independently
        const next = [...widgets];
        areas.forEach((a, di) => {
          const onThis = widgets.filter((w) => w.display === di && w.open);
          const items = onThis.map((w) => {
            const [ww, wh] = sizeOf(w.kind, w.size);
            return { id: w.id, w: ww, h: wh };
          });
          const pos = arrange(items, a, m, settings.gap, settings.margin);
          for (const w of onThis) {
            const i = next.findIndex((n) => n.id === w.id);
            next[i] = { ...next[i], ...pos[w.id], dock: null };
          }
        });
        set({ widgets: next });
      },

      redock: () => {
        const { widgets, settings } = get();
        const zones: DockZone[] = [
          "top-left", "top-right", "bottom-left", "bottom-right",
          "left", "right", "top", "bottom", "center",
        ];
        let n = 0;
        set({
          widgets: widgets.map((w) => {
            if (!w.open) return w;
            const a = get().areaOf(w);
            const [ww, wh] = sizeOf(w.kind, w.size);
            const zone = zones[n++ % zones.length];
            const p = dockPosition(zone, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin);
            return { ...w, ...p, dock: zone };
          }),
        });
      },

      reset: () => set({ widgets: seed(), zTop: STARTER.length, settings: DEFAULT_SETTINGS }),

      closeAll: () => set({ widgets: get().widgets.map((w) => ({ ...w, open: false })) }),
      openAll: () => set({ widgets: get().widgets.map((w) => ({ ...w, open: true })) }),

      update: (patch) => set({ settings: { ...get().settings, ...patch } }),
    }),
    {
      name: "widgeto.v2",
      storage: createJSONStorage(() => (IS_WIDGET_WINDOW ? noopStorage : localStorage)),
      partialize: (s) => ({ widgets: s.widgets, settings: s.settings, zTop: s.zTop }),
    },
  ),
);

/** First non-overlapping slot, scanning left-to-right then top-to-bottom. */
function findFreeSpot(
  widgets: WidgetInstance[],
  size: { w: number; h: number },
  a: { w: number; h: number },
  margin: number,
  gap: number,
) {
  const taken = widgets
    .filter((w) => w.open)
    .map((w) => {
      const [ww, wh] = sizeOf(w.kind, w.size);
      return { x: w.x, y: w.y, w: ww, h: wh };
    });
  const step = 24;
  for (let y = margin; y < a.h - size.h; y += step) {
    for (let x = margin; x < a.w - size.w; x += step) {
      const hit = taken.some(
        (t) =>
          x < t.x + t.w + gap &&
          x + size.w + gap > t.x &&
          y < t.y + t.h + gap &&
          y + size.h + gap > t.y,
      );
      if (!hit) return { x, y };
    }
  }
  return { x: margin + Math.random() * 60, y: margin + Math.random() * 60 };
}

// Dev-only handle so the store can be inspected from the console.
if (import.meta.env.DEV) {
  (window as unknown as { __widgeto: unknown }).__widgeto = useApp;
}
