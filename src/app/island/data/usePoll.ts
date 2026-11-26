import { useEffect, useRef, useState } from "react";

/**
 * Polls `fn` every `ms` while `active`, chaining timeouts so a slow call never
 * stacks up behind itself. Errors keep the last good value. Deliberately not
 * TanStack Query: the island is one small window with four feeds, and the
 * query client would be most of its bundle.
 */
export function usePoll<T>(fn: () => Promise<T>, ms: number, active = true, fallback?: T) {
  const [data, setData] = useState<T | undefined>(fallback);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!active) return;
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
  }, [ms, active, nonce]);

  /** fetch again now, e.g. right after a media button */
  const refresh = () => setNonce((n) => n + 1);
  return { data, refresh };
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
