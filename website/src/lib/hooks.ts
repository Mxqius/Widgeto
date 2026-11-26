import { useEffect, useRef, useState } from "react";

/** The current time, re-read every `ms`. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** A number that wanders around `start`, staying inside [min, max]. */
export function useDrift(start: number, step: number, min: number, max: number, ms = 1400) {
  const [v, setV] = useState(start);
  useEffect(() => {
    const t = setInterval(() => {
      setV((x) => Math.min(max, Math.max(min, x + (Math.random() - 0.5) * 2 * step)));
    }, ms);
    return () => clearInterval(t);
  }, [step, min, max, ms]);
  return v;
}

/** The last `n` values of a wandering number, newest last. */
export function useHistory(n: number, gen: () => number, ms = 900) {
  const genRef = useRef(gen);
  genRef.current = gen;
  const [xs, setXs] = useState(() => Array.from({ length: n }, () => genRef.current()));
  useEffect(() => {
    const t = setInterval(() => setXs((p) => [...p.slice(1), genRef.current()]), ms);
    return () => clearInterval(t);
  }, [ms]);
  return xs;
}

export const pad = (n: number) => String(n).padStart(2, "0");
