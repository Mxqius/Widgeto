import { useCallback, useEffect, useRef } from "react";

/**
 * If frames are not being served — an occluded or backgrounded window — the
 * pending value is flushed on this timer instead, so it can never be stranded.
 */
const BACKSTOP_MS = 50;

/**
 * Wrap a store write so a stream of values collapses to one write per frame.
 *
 * The native colour input fires `input` for every pixel the pointer travels
 * inside the picker — well above 60 a second — and each one was a full store
 * update: a new widgets array, a re-render of everything watching it, and a
 * write to disk. Nothing downstream can paint faster than a frame anyway, so
 * the latest value is held and pushed on the next one, and everything in
 * between is dropped.
 *
 * The final value always lands. The last call before the pointer stops still
 * schedules its flush; a window that stops painting falls back to the timer;
 * and unmounting mid-drag flushes rather than cancels.
 */
export function useFrameCommit<T>(commit: (value: T) => void) {
  const latest = useRef<T>(undefined as T);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fn = useRef(commit);
  fn.current = commit;

  const flush = useCallback(() => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    fn.current(latest.current);
  }, []);

  const pending = () => frame.current !== 0 || timer.current !== null;

  useEffect(() => () => {
    if (pending()) flush();
  }, [flush]);

  return useCallback(
    (value: T) => {
      latest.current = value;
      if (pending()) return;
      frame.current = requestAnimationFrame(flush);
      timer.current = setTimeout(flush, BACKSTOP_MS);
    },
    [flush],
  );
}
