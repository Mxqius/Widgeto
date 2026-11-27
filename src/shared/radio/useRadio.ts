import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@/shared/lib/env";
import { radioFavicon, radioSearch } from "@/shared/ipc/commands";
import { EMPTY_RADIO, RADIO_EVT, type RadioCmd, type RadioQuery, type RadioState, type Station } from "./protocol";

/** Send a command to the player in the manager window. */
export async function sendRadio(cmd: RadioCmd) {
  if (!isTauri()) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit(RADIO_EVT.cmd, cmd);
}

/**
 * The radio as a remote sees it: the manager's latest state, and a way to
 * tell it what to do. Says hello on mount so a window that opens while
 * something is already playing shows it straight away.
 */
export function useRadio() {
  const [state, setState] = useState<RadioState>(EMPTY_RADIO);

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    let un: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen, emit }) => {
      const off = await listen<RadioState>(RADIO_EVT.state, (e) => alive && setState(e.payload));
      if (!alive) return off();
      un = off;
      await emit(RADIO_EVT.hello);
    });
    return () => {
      alive = false;
      un?.();
    };
  }, []);

  const send = useCallback((cmd: RadioCmd) => void sendRadio(cmd), []);
  return { state, send };
}

export interface StationSearch {
  stations: Station[];
  loading: boolean;
  error: string | null;
}

/**
 * Debounced directory search. `null` means "not searching" and costs
 * nothing; any query, even an empty one, lists the most popular matches.
 */
export function useStationSearch(query: RadioQuery | null, delayMs = 350): StationSearch {
  const [res, setRes] = useState<StationSearch>({ stations: [], loading: false, error: null });
  const key = query ? JSON.stringify(query) : null;
  const seq = useRef(0);

  useEffect(() => {
    if (key === null) return;
    const n = ++seq.current;
    setRes((r) => ({ ...r, loading: true, error: null }));
    const t = setTimeout(() => {
      radioSearch(JSON.parse(key) as RadioQuery)
        .then((r) => n === seq.current && setRes({ stations: r.stations, loading: false, error: null }))
        .catch((e) =>
          n === seq.current &&
          setRes({ stations: [], loading: false, error: String(e).replace(/^Error:\s*/, "") }),
        );
    }, delayMs);
    return () => clearTimeout(t);
  }, [key, delayMs]);

  return res;
}

/** Icons asked for once per window; the Rust side keeps its own cache too. */
const icons = new Map<string, Promise<string | null>>();

/** A station's icon as a data URL, or null while it loads or when it has none. */
export function useFavicon(url: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (!url || !isTauri()) return;
    let alive = true;
    let p = icons.get(url);
    if (!p) {
      p = radioFavicon(url).catch(() => null);
      icons.set(url, p);
    }
    void p.then((v) => alive && setSrc(v));
    return () => {
      alive = false;
    };
  }, [url]);
  return src;
}
