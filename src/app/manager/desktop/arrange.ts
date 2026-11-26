import type { ArrangeMode } from "@/shared/types/geometry";
import { clamp } from "@/shared/lib/math";
import type { Bounds } from "@/shared/layout/snap";

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
