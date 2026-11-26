import { useEffect, useRef, useState } from "react";

/**
 * Keeps the last N readings so a widget can draw a trend. Query results are
 * point-in-time, so the history lives here rather than in each widget.
 *
 * The append happens in an effect, not during render: mutating a ref while
 * rendering breaks the moment React retries a render, which it is free to do.
 */
export function useTrail(value: number | undefined, len = 28): number[] {
  const [trail, setTrail] = useState<number[]>([]);
  const lenRef = useRef(len);
  lenRef.current = len;

  useEffect(() => {
    if (value === undefined || !Number.isFinite(value)) return;
    setTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last === value && prev.length >= 2) return prev;
      return [...prev, value].slice(-lenRef.current);
    });
  }, [value]);

  return trail.length ? trail : EMPTY;
}

const EMPTY = [0];
