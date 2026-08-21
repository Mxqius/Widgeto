import type { ArrangeMode, DockZone, Rect } from "./types";
import { clamp } from "./utils";

export const DOCK_ZONES: DockZone[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

export interface Bounds {
  w: number;
  h: number;
}

/** Top-left position a rect should take to sit in a given dock zone. */
export function dockPosition(zone: DockZone, r: Rect, b: Bounds, margin: number) {
  const left = margin;
  const right = Math.max(margin, b.w - r.w - margin);
  const cx = Math.max(margin, (b.w - r.w) / 2);
  const top = margin;
  const bottom = Math.max(margin, b.h - r.h - margin);
  const cy = Math.max(margin, (b.h - r.h) / 2);

  switch (zone) {
    case "top-left": return { x: left, y: top };
    case "top": return { x: cx, y: top };
    case "top-right": return { x: right, y: top };
    case "left": return { x: left, y: cy };
    case "center": return { x: cx, y: cy };
    case "right": return { x: right, y: cy };
    case "bottom-left": return { x: left, y: bottom };
    case "bottom": return { x: cx, y: bottom };
    case "bottom-right": return { x: right, y: bottom };
  }
}

/**
 * Magnetic docking. Returns the zone whose anchor is within `threshold`
 * of the dragged rect's matching anchor, preferring corners over edges.
 */
export function resolveDock(
  r: Rect,
  b: Bounds,
  margin: number,
  threshold: number,
): { zone: DockZone; x: number; y: number } | null {
  const nearLeft = r.x - margin <= threshold;
  const nearRight = b.w - margin - (r.x + r.w) <= threshold;
  const nearTop = r.y - margin <= threshold;
  const nearBottom = b.h - margin - (r.y + r.h) <= threshold;

  let zone: DockZone | null = null;
  if (nearTop && nearLeft) zone = "top-left";
  else if (nearTop && nearRight) zone = "top-right";
  else if (nearBottom && nearLeft) zone = "bottom-left";
  else if (nearBottom && nearRight) zone = "bottom-right";
  else if (nearTop) zone = "top";
  else if (nearBottom) zone = "bottom";
  else if (nearLeft) zone = "left";
  else if (nearRight) zone = "right";

  if (!zone) return null;
  const p = dockPosition(zone, r, b, margin);
  // edge zones keep the free axis where the user dropped it
  if (zone === "top" || zone === "bottom") p.x = clamp(r.x, margin, b.w - r.w - margin);
  if (zone === "left" || zone === "right") p.y = clamp(r.y, margin, b.h - r.h - margin);
  return { zone, ...p };
}

export interface Guide {
  axis: "x" | "y";
  at: number;
  from: number;
  to: number;
}

/** Photoshop-style alignment guides + snapping against sibling widgets. */
export function alignSnap(r: Rect, others: Rect[], _b: Bounds, tol: number) {
  let x = r.x;
  let y = r.y;
  let bestX = tol + 1;
  let bestY = tol + 1;
  let guideX: Guide | null = null;
  let guideY: Guide | null = null;

  for (const o of others) {
    // candidate x positions: edges aligned, centers aligned, edge-to-edge stacked
    const xc: [number, number][] = [
      [o.x, o.x],                                   // left edges
      [o.x + o.w - r.w, o.x + o.w],                 // right edges
      [o.x + o.w / 2 - r.w / 2, o.x + o.w / 2],     // centers
      [o.x + o.w, o.x + o.w],                       // my left to their right
      [o.x - r.w, o.x],                             // my right to their left
    ];
    for (const [pos, line] of xc) {
      const d = Math.abs(pos - r.x);
      if (d < bestX) {
        bestX = d;
        x = pos;
        guideX = {
          axis: "x",
          at: line,
          from: Math.min(o.y, r.y) - 12,
          to: Math.max(o.y + o.h, r.y + r.h) + 12,
        };
      }
    }

    const yc: [number, number][] = [
      [o.y, o.y],
      [o.y + o.h - r.h, o.y + o.h],
      [o.y + o.h / 2 - r.h / 2, o.y + o.h / 2],
      [o.y + o.h, o.y + o.h],
      [o.y - r.h, o.y],
    ];
    for (const [pos, line] of yc) {
      const d = Math.abs(pos - r.y);
      if (d < bestY) {
        bestY = d;
        y = pos;
        guideY = {
          axis: "y",
          at: line,
          from: Math.min(o.x, r.x) - 12,
          to: Math.max(o.x + o.w, r.x + r.w) + 12,
        };
      }
    }
  }

  const okX = bestX <= tol;
  const okY = bestY <= tol;
  const guides: Guide[] = [];
  if (okX && guideX) guides.push(guideX);
  if (okY && guideY) guides.push(guideY);

  return { x: okX ? x : r.x, y: okY ? y : r.y, guides, snappedX: okX, snappedY: okY };
}

export function snapToGrid(v: number, grid: number) {
  return Math.round(v / grid) * grid;
}

export interface ArrangeItem {
  id: string;
  w: number;
  h: number;
}

/** Deterministic auto-placement. Returns id -> position. */
export function arrange(
  items: ArrangeItem[],
  b: Bounds,
  mode: ArrangeMode,
  gap: number,
  margin: number,
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const availW = b.w - margin * 2;
  const availH = b.h - margin * 2;

  if (mode === "cascade") {
    items.forEach((it, i) => {
      out[it.id] = {
        x: clamp(margin + i * 34, margin, Math.max(margin, b.w - it.w - margin)),
        y: clamp(margin + i * 30, margin, Math.max(margin, b.h - it.h - margin)),
      };
    });
    return out;
  }

  if (mode === "ring") {
    const cx = b.w / 2;
    const cy = b.h / 2;
    const rx = Math.max(160, availW / 2 - 190);
    const ry = Math.max(120, availH / 2 - 150);
    items.forEach((it, i) => {
      const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      out[it.id] = {
        x: clamp(cx + Math.cos(a) * rx - it.w / 2, margin, b.w - it.w - margin),
        y: clamp(cy + Math.sin(a) * ry - it.h / 2, margin, b.h - it.h - margin),
      };
    });
    return out;
  }

  if (mode === "columns") {
    // balanced column packing — shortest column wins next widget
    const colW = Math.max(...items.map((i) => i.w), 1);
    const cols = Math.max(1, Math.floor((availW + gap) / (colW + gap)));
    const heights = new Array(cols).fill(margin);
    for (const it of items) {
      let c = 0;
      for (let i = 1; i < cols; i++) if (heights[i] < heights[c]) c = i;
      out[it.id] = { x: margin + c * (colW + gap), y: heights[c] };
      heights[c] += it.h + gap;
    }
    return out;
  }

  // "grid": shelf packing, keeps reading order, wraps on overflow
  let x = margin;
  let y = margin;
  let rowH = 0;
  for (const it of items) {
    if (x + it.w > b.w - margin && x > margin) {
      x = margin;
      y += rowH + gap;
      rowH = 0;
    }
    out[it.id] = { x, y };
    x += it.w + gap;
    rowH = Math.max(rowH, it.h);
  }
  return out;
}
