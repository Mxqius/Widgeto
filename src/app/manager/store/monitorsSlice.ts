import type { DockZone } from "@/shared/types/geometry";
import { BROWSER_AREA } from "@/shared/desktop/area";
import { sizeOf } from "@/shared/widgets/kinds";
import { dockPosition } from "@/shared/layout/snap";
import { arrange } from "@/app/manager/desktop/arrange";
import { clamp } from "@/shared/lib/math";
import type { MonitorsSlice, Slice } from "./types";

const REDOCK_ORDER: DockZone[] = [
  "top-left", "top-right", "bottom-left", "bottom-right",
  "left", "right", "top", "bottom", "center",
];

export const createMonitorsSlice: Slice<MonitorsSlice> = (set, get) => ({
  areas: [BROWSER_AREA],

  setAreas: (areas) => {
    const { areas: prev, widgets, settings } = get();
    // identical monitor layout: keep every object identity so effects that
    // depend on `widgets` do not restart on each poll
    const same =
      prev.length === areas.length &&
      prev.every(
        (p, i) =>
          p.x === areas[i].x &&
          p.y === areas[i].y &&
          p.w === areas[i].w &&
          p.h === areas[i].h &&
          p.scale === areas[i].scale,
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
    let n = 0;
    set({
      widgets: widgets.map((w) => {
        if (!w.open) return w;
        const a = areas[w.display] ?? areas[0];
        if (!a) return w;
        const [ww, wh] = sizeOf(w.kind, w.size);
        const zone = REDOCK_ORDER[n++ % REDOCK_ORDER.length];
        const p = dockPosition(zone, { x: w.x, y: w.y, w: ww, h: wh }, a, settings.margin);
        return { ...w, ...p, dock: zone };
      }),
    });
  },
});
