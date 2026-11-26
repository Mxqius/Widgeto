import { useEffect, useRef, useState } from "react";
import { fetchMedia, mediaControl, mediaSeek, type MediaAction, type MediaNow } from "@/shared/ipc/commands";
import { isTauri } from "@/shared/lib/env";
import { vividColour } from "../lib/colour";
import { invoke } from "./bridge";
import { usePoll } from "./usePoll";
import { SAMPLE_ART, SAMPLE_MEDIA } from "./sample";

export interface Track {
  media: MediaNow | undefined;
  /** title + artist; changes exactly when the track does */
  key: string | null;
  art: string | null;
  /** the cover's most vivid colour, when it has one */
  tint: string | null;
  /** best estimate of the playhead, in seconds, at `now` */
  positionAt: (now: number) => number;
  send: (a: MediaAction) => Promise<void>;
  /** jump to `sec`; the playhead moves at once, ahead of the player */
  seek: (sec: number) => void;
}

/**
 * The system media session, as the island needs it: polled, with cover art
 * fetched once per track, and a playhead that keeps moving between polls —
 * Windows only refreshes the timeline when the player feels like it.
 */
export function useIslandMedia(): Track {
  const live = isTauri();
  const { data, refresh } = usePoll(fetchMedia, 1500, live, live ? undefined : SAMPLE_MEDIA);

  // outside the app the sample track still answers its buttons
  const [sample, setSample] = useState({ playing: true, shuffle: false, repeat: "none" as MediaNow["repeat"] });
  const media = live || !data ? data : { ...data, ...sample };

  const key = media?.title ? `${media.title}\u001f${media.artist ?? ""}` : null;

  const [art, setArt] = useState<{ key: string; src: string | null; tint: string | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    let tries = 0;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      const src = live ? await invoke<string | null>("media_art").catch(() => null) : SAMPLE_ART;
      const tint = src ? await vividColour(src) : null;
      if (!alive) return;
      setArt({ key, src, tint });
      // Players often publish the cover a moment — sometimes seconds — after
      // the title, so keep asking for a while. The native side only caches a
      // cover it actually found, so each retry is a real read.
      if (!src && ++tries < 10) t = setTimeout(load, 2000);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [key, live]);

  // Anchor the playhead whenever the reported position or state really changes.
  const anchor = useRef({ pos: 0, at: Date.now(), key: null as string | null, playing: false, raw: -1 });
  const raw = media?.positionSec ?? 0;
  const playing = !!media?.playing;
  const a = anchor.current;
  if (a.key !== key || a.raw !== raw || a.playing !== playing) {
    const carried = a.key === key && a.raw === raw ? a.pos + (a.playing ? (Date.now() - a.at) / 1000 : 0) : raw;
    anchor.current = { pos: carried, at: Date.now(), key, playing, raw };
  }

  const dur = media?.durationSec ?? 0;
  const positionAt = (now: number) => {
    const { pos, at, playing: p } = anchor.current;
    const v = pos + (p ? (now - at) / 1000 : 0);
    return dur > 0 ? Math.min(dur, Math.max(0, v)) : Math.max(0, v);
  };

  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(settle.current), []);

  const [, bump] = useState(0);
  const seek = (sec: number) => {
    const to = dur > 0 ? Math.min(dur, Math.max(0, sec)) : Math.max(0, sec);
    anchor.current = { ...anchor.current, pos: to, at: Date.now() };
    bump((n) => n + 1);
    if (!live) return;
    void mediaSeek(to)
      .catch(() => {})
      .finally(() => {
        clearTimeout(settle.current);
        settle.current = setTimeout(refresh, 300);
      });
  };

  const send = async (action: MediaAction) => {
    if (!live) {
      setSample((s) => {
        if (action === "toggle") return { ...s, playing: !s.playing };
        if (action === "shuffle") return { ...s, shuffle: !s.shuffle };
        if (action === "repeat")
          return { ...s, repeat: s.repeat === "none" ? "list" : s.repeat === "list" ? "track" : "none" };
        return s;
      });
      return;
    }
    try {
      await mediaControl(action);
    } catch {
      /* nothing is playing, or the source refused */
    }
    clearTimeout(settle.current);
    settle.current = setTimeout(refresh, 250);
  };

  const current = art && art.key === key ? art : null;
  return { media, key, art: current?.src ?? null, tint: current?.tint ?? null, positionAt, send, seek };
}
