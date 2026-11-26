import { useCallback, useEffect, useRef, useState } from "react";

export type ActivityIcon = "track" | "charging" | "unplugged" | "battery" | "focus" | "break" | "note";

export interface Activity {
  id: number;
  icon: ActivityIcon;
  title: string;
  subtitle?: string;
  /** short value on the right, e.g. "64%" */
  trailing?: string;
  /** colour for the icon and trailing value */
  tone?: string;
  /** track activities show the cover */
  art?: string | null;
  at: number;
}

const SHOW_MS = 3600;
/** a pop-out that waited longer than this is stale news; drop it */
const STALE_MS = 9000;

/**
 * The island's "live activities": brief pop-outs queued one at a time. While
 * the island is open under the pointer they wait, and if they wait too long
 * they are dropped — the expanded view is already showing the same thing.
 */
export function useActivities(paused: boolean) {
  const [queue, setQueue] = useState<Activity[]>([]);
  const [current, setCurrent] = useState<Activity | null>(null);
  const seq = useRef(0);

  const push = useCallback((a: Omit<Activity, "id" | "at">) => {
    const next = { ...a, id: ++seq.current, at: Date.now() };
    // a newer pop-out of the same kind replaces one still waiting
    setQueue((q) => [...q.filter((x) => x.icon !== next.icon), next]);
  }, []);

  // promote the next one
  useEffect(() => {
    if (paused || current || !queue.length) return;
    const fresh = queue.filter((a) => Date.now() - a.at < STALE_MS);
    setQueue(fresh.slice(1));
    if (fresh[0]) setCurrent(fresh[0]);
  }, [paused, current, queue]);

  // and retire it
  useEffect(() => {
    if (!current) return;
    if (paused) {
      setCurrent(null);
      return;
    }
    const t = setTimeout(() => setCurrent(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [current, paused]);

  const dismiss = useCallback(() => setCurrent(null), []);
  return { current, push, dismiss };
}
