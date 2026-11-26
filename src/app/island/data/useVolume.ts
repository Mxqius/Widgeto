import { useCallback, useEffect, useRef, useState } from "react";
import { setMuted, setVolume, type Volume } from "@/shared/ipc/commands";

/** After the island itself changes the volume, ignore echoes for this long. */
const ECHO_MS = 700;

/**
 * The system volume, as the island shows and drives it.
 *
 * The native watcher is the source of truth, but while the user drags the
 * slider or scrolls over the island the local value leads, so the control
 * never snaps back to a reading taken a moment before their own change. Writes
 * are coalesced: however fast the pointer moves, at most one call is in
 * flight, and it always carries the latest level.
 */
export function useVolume(native: Volume | undefined, live: boolean, onLocal?: (v: Volume) => void) {
  const [vol, setVol] = useState<Volume | undefined>(native);
  const current = useRef(vol);
  current.current = vol;
  const touched = useRef(0);

  useEffect(() => {
    if (native && Date.now() - touched.current > ECHO_MS) setVol(native);
  }, [native]);

  const pending = useRef<number | null>(null);
  const busy = useRef(false);
  const flush = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    while (pending.current !== null) {
      const level = pending.current;
      pending.current = null;
      try {
        await setVolume(level);
      } catch {
        /* no output device */
      }
    }
    busy.current = false;
  }, []);

  const set = useCallback(
    (level: number) => {
      const l = Math.round(Math.min(1, Math.max(0, level)) * 100) / 100;
      touched.current = Date.now();
      const next = { level: l, muted: l === 0 ? (current.current?.muted ?? false) : false };
      current.current = next;
      setVol(next);
      onLocal?.(next);
      if (live) {
        pending.current = l;
        void flush();
      }
    },
    [live, flush, onLocal],
  );

  const toggleMute = useCallback(() => {
    const v = current.current;
    if (!v) return;
    const next = { ...v, muted: !v.muted };
    touched.current = Date.now();
    current.current = next;
    setVol(next);
    onLocal?.(next);
    if (live) void setMuted(next.muted).catch(() => {});
  }, [live, onLocal]);

  /** for the scroll wheel: step from wherever it is now */
  const nudge = useCallback((delta: number) => set((current.current?.level ?? 0.5) + delta), [set]);

  return { vol, set, toggleMute, nudge };
}

export type VolumeCtl = ReturnType<typeof useVolume>;
