import { useEffect, useRef, useState } from "react";

/**
 * Polls `fn` every `ms` while `active`, chaining timeouts so a slow call never
 * stacks up behind itself. Errors keep the last good value. Deliberately not
 * TanStack Query: the island is one small window with four feeds, and the
 * query client would be most of its bundle.
 *
 * `key` names what is being fetched (the weather's city, say). When it
 * changes, the poll starts over at once and the old value is dropped — it
 * belongs to something else now — instead of lingering until the next tick,
 * which for a slow feed can be many minutes away.
 */
export function usePoll<T>(fn: () => Promise<T>, ms: number, active = true, fallback?: T, key?: unknown) {
  const [data, setData] = useState<T | undefined>(fallback);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const [nonce, setNonce] = useState(0);
  const keyRef = useRef(key);

  useEffect(() => {
    if (!active) return;
    if (!Object.is(keyRef.current, key)) {
      keyRef.current = key;
      setData(fallbackRef.current);
    }
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const run = async () => {
      try {
        const v = await fnRef.current();
        if (alive) setData(v);
      } catch {
        /* keep what we had */
      }
      if (alive) t = setTimeout(run, ms);
    };
    void run();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ms, active, nonce, key]);

  /** fetch again now, e.g. right after a media button */
  const refresh = () => setNonce((n) => n + 1);
  return { data, refresh };
}

/** `value`, once it has stopped changing for `ms` — so typing a city name fetches once, not per key. */
export function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (Object.is(value, settled)) return;
    // nothing settled yet (the island's first config): take it straight away
    const t = setTimeout(() => setSettled(value), settled == null ? 0 : ms);
    return () => clearTimeout(t);
  }, [value, settled, ms]);
  return settled;
}

/** Re-renders every `ms`, aligned to the wall clock. */
export function useNow(ms = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      t = setTimeout(tick, ms - (Date.now() % ms) + 5);
    };
    t = setTimeout(tick, ms - (Date.now() % ms) + 5);
    return () => clearTimeout(t);
  }, [ms, active]);
  return now;
}
