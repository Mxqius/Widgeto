import { useCallback, useEffect, useRef, useState } from "react";
import type { IslandConfig } from "@/shared/island/protocol";

export type FocusMode = "focus" | "short" | "long";

interface Saved {
  mode: FocusMode;
  /** wall-clock end while running; null when paused or idle */
  endAt: number | null;
  /** seconds left while paused */
  left: number;
  /** finished focus sessions, and the day they were counted on */
  done: number;
  day: string;
}

const KEY = "widgeto.island.focus";
const today = () => new Date().toDateString();

function load(total: number): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (s && typeof s.left === "number") return s.day === today() ? s : { ...s, done: 0, day: today() };
  } catch {
    /* fall through */
  }
  return { mode: "focus", endAt: null, left: total, done: 0, day: today() };
}

/**
 * A focus timer that survives the island restarting: it counts against a
 * wall-clock deadline and keeps that deadline in localStorage, so closing the
 * app mid-session and coming back still ends the session on time.
 */
export function useFocus(cfg: IslandConfig["focus"], onDone: (mode: FocusMode) => void) {
  const minutes = useCallback(
    (m: FocusMode) => (m === "focus" ? cfg.focusMin : m === "short" ? cfg.shortMin : cfg.longMin) * 60,
    [cfg.focusMin, cfg.shortMin, cfg.longMin],
  );

  const [s, setS] = useState<Saved>(() => load(minutes("focus")));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* private storage */
    }
  }, [s]);

  const running = s.endAt !== null;
  const total = minutes(s.mode);
  const left = running ? Math.max(0, Math.ceil((s.endAt! - now) / 1000)) : Math.min(s.left, total);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // finished: count it, move to the natural next mode, and stop
  useEffect(() => {
    if (!running || left > 0) return;
    const finished = s.mode;
    setS((p) => {
      const done = finished === "focus" ? p.done + 1 : p.done;
      const next: FocusMode = finished === "focus" ? (done % 4 === 0 ? "long" : "short") : "focus";
      return { ...p, mode: next, endAt: null, left: minutes(next), done };
    });
    doneRef.current(finished);
  }, [running, left, s.mode, minutes]);

  const start = () => {
    setNow(Date.now());
    setS((p) => ({ ...p, endAt: Date.now() + (left > 0 ? left : total) * 1000 }));
  };
  const pause = () => setS((p) => ({ ...p, endAt: null, left }));
  const reset = () => setS((p) => ({ ...p, endAt: null, left: minutes(p.mode) }));
  const setMode = (mode: FocusMode) => setS((p) => ({ ...p, mode, endAt: null, left: minutes(mode) }));

  return {
    mode: s.mode,
    running,
    left,
    total,
    progress: total > 0 ? 1 - left / total : 0,
    done: s.done,
    /** a session is under way: running, or paused part-way through */
    active: running || left < total,
    start,
    pause,
    reset,
    setMode,
  };
}

export type Focus = ReturnType<typeof useFocus>;
