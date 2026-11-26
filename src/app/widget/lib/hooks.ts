import { useEffect, useRef, useState } from "react";
import { usePageVisible } from "./visibility";

/**
 * The current time, re-read on an interval — but only while the window is
 * visible. Coming back from hidden catches up immediately so the tile is never
 * caught showing a stale minute.
 */
export function useNow(ms = 1000) {
  const visible = usePageVisible();
  const [now, setNow] = useState(() => new Date());
  const wasHidden = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasHidden.current = true;
      return;
    }
    if (wasHidden.current) {
      wasHidden.current = false;
      setNow(new Date());
    }
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms, visible]);

  return now;
}

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initial;
  } catch {
    return initial;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota, or private mode — the widget still works, it just forgets */
  }
}

/**
 * Local, persisted piece of widget state.
 *
 * Writes are debounced: the notes widget re-serialises its whole body on every
 * keystroke otherwise. Anything still pending is flushed on unmount and on
 * `pagehide`, so closing a widget mid-sentence does not lose the sentence.
 */
export function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => read(key, initial));
  const latest = useRef(v);
  const stored = useRef(v);

  useEffect(() => {
    latest.current = v;
    // also skips the pointless write on mount, when the two already agree
    if (Object.is(v, stored.current)) return;
    const t = setTimeout(() => {
      write(key, v);
      stored.current = v;
    }, 250);
    return () => clearTimeout(t);
  }, [key, v]);

  useEffect(() => {
    const flush = () => {
      if (Object.is(latest.current, stored.current)) return;
      write(key, latest.current);
      stored.current = latest.current;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [key]);

  return [v, setV] as const;
}
