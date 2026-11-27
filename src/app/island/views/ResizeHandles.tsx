import { useCallback, useRef, useState, type PointerEvent } from "react";
import type { IslandAlign } from "@/shared/types/settings";

export interface Size {
  w: number;
  h: number;
}

/** The Ask chat's size once there is an answer to read, as first designed. */
export const ASK_DEFAULT: Size = { w: 468, h: 264 };
/** Small enough to tuck away, big enough for the tab strip and the field. */
export const ASK_MIN: Size = { w: 400, h: 200 };

/** Remembered across restarts, like the tuck: a size you dragged to is a preference. */
const KEY = "widgeto.island.askSize";

const read = (): Size => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Size> | null;
    if (v && typeof v.w === "number" && typeof v.h === "number") return { w: v.w, h: v.h };
  } catch {
    /* unreadable: start from the default */
  }
  return ASK_DEFAULT;
};

/** The chat's size: `set` while dragging, `save` when the drag ends. */
export function useAskSize() {
  const [size, set] = useState<Size>(read);
  const save = useCallback((s: Size) => {
    set(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable: it just won't be remembered */
    }
  }, []);
  return { size, set, save };
}

type Edge = "s" | "e" | "w" | "se" | "sw";

/**
 * Grab the bottom edge, a side or a bottom corner of the open Ask chat and
 * drag. The island stays anchored where it lives: centred, it grows both ways
 * at once, so a side moves twice as far as the pointer would otherwise take it
 * and the edge stays under the pointer. Double-click the bottom edge to put
 * the size back.
 */
export function ResizeHandles({ size, max, align, scale, onSize, onDone, onActive }: {
  size: Size;
  max: Size;
  align: IslandAlign;
  /** the island's zoom; pointer travel is in screen pixels, sizes in island units */
  scale: number;
  onSize: (s: Size) => void;
  onDone: (s: Size) => void;
  onActive: (dragging: boolean) => void;
}) {
  const drag = useRef<{ x: number; y: number; from: Size; edge: Edge; last: Size } | null>(null);
  // a side hugging the screen edge stays put; only the free side moves
  const edges: Edge[] =
    align === "left" ? ["s", "e", "se"] : align === "right" ? ["s", "w", "sw"] : ["s", "e", "w", "se", "sw"];
  const k = align === "center" ? 2 : 1;

  const fit = (s: Size): Size => ({
    w: Math.round(Math.min(max.w, Math.max(ASK_MIN.w, s.w))),
    h: Math.round(Math.min(max.h, Math.max(ASK_MIN.h, s.h))),
  });

  const down = (edge: Edge) => (e: PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: size, edge, last: size };
    onActive(true);
  };
  const move = (e: PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / scale;
    const dy = (e.clientY - d.y) / scale;
    let { w, h } = d.from;
    if (d.edge.includes("e")) w += dx * k;
    if (d.edge.includes("w")) w -= dx * k;
    if (d.edge.includes("s")) h += dy;
    d.last = fit({ w, h });
    onSize(d.last);
  };
  const up = (e: PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onActive(false);
    onDone(d.last);
  };

  return (
    <>
      {edges.map((edge) => (
        <span
          key={edge}
          className={`island-resize island-resize-${edge}`}
          onPointerDown={down(edge)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={edge === "s" ? () => onDone(fit(ASK_DEFAULT)) : undefined}
          title={edge === "s" ? "Drag to resize · double-click to reset" : undefined}
          aria-hidden
        />
      ))}
    </>
  );
}
