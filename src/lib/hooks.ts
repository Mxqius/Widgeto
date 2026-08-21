import { useEffect, useRef, useState } from "react";

/** Re-render on an interval. */
export function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Smooth pseudo-random series — stands in for real telemetry in the prototype.
 * Values wander instead of jumping so the sparklines look plausible.
 */
export function useSeries(len: number, base: number, spread: number, ms = 1200) {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: len }, () => base + (Math.random() - 0.5) * spread),
  );
  const last = useRef(base);
  useEffect(() => {
    const t = setInterval(() => {
      setData((d) => {
        last.current = Math.max(
          0,
          Math.min(100, last.current + (Math.random() - 0.5) * spread * 0.5 + (base - last.current) * 0.12),
        );
        return [...d.slice(1), last.current];
      });
    }, ms);
    return () => clearInterval(t);
  }, [base, spread, ms]);
  return data;
}

/** Local, persisted piece of widget state. */
export function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* quota — ignore in the prototype */
    }
  }, [key, v]);
  return [v, setV] as const;
}
