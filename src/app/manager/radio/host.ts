import { useEffect, useSyncExternalStore } from "react";
import { useApp } from "../store";
import { isTauri } from "@/shared/lib/env";
import { radioClick, radioNowTitle } from "@/shared/ipc/commands";
import { RADIO_EVT, type RadioCmd, type RadioState, type Station } from "@/shared/radio/protocol";

/**
 * The one radio player. It lives in the manager window because that is the
 * only window that exists for the whole run — widget windows close when they
 * are hidden, the island when it is switched off — so audio started from any
 * of them keeps going here. Favorites and volume are kept in the store; what
 * is playing right now is kept here and never persisted.
 */

/** How often to ask the stream what it is playing. */
const TITLE_EVERY_MS = 15_000;
/** A stream that has not started after this long is treated as dead. */
const START_TIMEOUT_MS = 20_000;

let audio: HTMLAudioElement | null = null;

const live = {
  station: null as Station | null,
  playing: false,
  buffering: false,
  error: null as string | null,
  nowTitle: null as string | null,
};

let snapshot: RadioState | null = null;
const listeners = new Set<() => void>();

function current(): RadioState {
  if (!snapshot) {
    const { favorites, volume, last } = useApp.getState().radio;
    snapshot = { ...live, station: live.station ?? last, volume, favorites };
  }
  return snapshot;
}

/** Tell every window, this one included, how things are now. */
function changed() {
  snapshot = null;
  const s = current();
  listeners.forEach((fn) => fn());
  if (!isTauri()) return;
  void import("@tauri-apps/api/event").then(({ emit }) => emit(RADIO_EVT.state, s));
}

function player() {
  if (audio) return audio;
  const a = new Audio();
  a.preload = "none";
  a.addEventListener("playing", () => {
    clearTimeout(startTimer);
    Object.assign(live, { playing: true, buffering: false, error: null });
    changed();
    void readTitle();
  });
  a.addEventListener("waiting", () => {
    if (!a.src) return;
    live.buffering = true;
    changed();
  });
  a.addEventListener("pause", () => {
    // the pause of the previous station lands after the next one has started
    if (!a.paused || (!live.playing && !live.buffering)) return;
    Object.assign(live, { playing: false, buffering: false });
    changed();
  });
  a.addEventListener("error", () => {
    // clearing the source on stop fires an error of its own; that one is ours
    if (!a.getAttribute("src")) return;
    fail();
  });
  audio = a;
  return a;
}

let startTimer: ReturnType<typeof setTimeout> | undefined;
let titleTimer: ReturnType<typeof setInterval> | undefined;

function release() {
  clearTimeout(startTimer);
  clearInterval(titleTimer);
  titleTimer = undefined;
  const a = audio;
  if (!a) return;
  a.pause();
  // a paused live stream keeps downloading; dropping the source is the only
  // way to actually hang up
  a.removeAttribute("src");
  a.load();
}

function fail() {
  release();
  Object.assign(live, { playing: false, buffering: false, nowTitle: null, error: "Couldn't play this station" });
  changed();
}

async function readTitle() {
  const st = live.station;
  if (!st || !isTauri()) return;
  const title = await radioNowTitle(st.url).catch(() => null);
  // the station may have changed or stopped while the stream was asked
  if (live.station?.id !== st.id || (!live.playing && !live.buffering)) return;
  if (title === live.nowTitle) return;
  live.nowTitle = title;
  changed();
}

function play(station: Station) {
  release();
  const a = player();
  a.volume = useApp.getState().radio.volume;
  a.src = station.url;
  Object.assign(live, { station, playing: false, buffering: true, error: null, nowTitle: null });
  useApp.getState().setRadio({ last: station });
  changed();

  a.play().catch((e: unknown) => {
    // a newer play() or a stop() interrupting this one is not a failure
    if (e instanceof DOMException && e.name === "AbortError") return;
    if (live.station?.id === station.id) fail();
  });
  startTimer = setTimeout(() => {
    if (live.station?.id === station.id && !live.playing) fail();
  }, START_TIMEOUT_MS);
  titleTimer = setInterval(() => void readTitle(), TITLE_EVERY_MS);

  if (!station.id.startsWith("custom:") && isTauri()) void radioClick(station.id).catch(() => {});
}

function stop() {
  release();
  Object.assign(live, { playing: false, buffering: false, nowTitle: null });
  changed();
}

function step(by: 1 | -1) {
  const { favorites, last } = useApp.getState().radio;
  if (!favorites.length) return;
  const at = favorites.findIndex((f) => f.id === (live.station ?? last)?.id);
  const next = at < 0 ? (by > 0 ? 0 : favorites.length - 1) : (at + by + favorites.length) % favorites.length;
  play(favorites[next]);
}

const isHttp = (u: string) => /^https?:\/\/\S+$/i.test(u.trim());

export function handleRadio(cmd: RadioCmd) {
  const store = useApp.getState();
  const { favorites } = store.radio;
  switch (cmd.type) {
    case "play":
      if (isHttp(cmd.station.url)) play(cmd.station);
      return;
    case "toggle": {
      if (live.playing || live.buffering) return stop();
      const st = live.station ?? store.radio.last ?? favorites[0];
      if (st) play(st);
      return;
    }
    case "stop":
      return stop();
    case "next":
      return step(1);
    case "prev":
      return step(-1);
    case "volume": {
      const v = Math.min(1, Math.max(0, cmd.volume));
      if (audio) audio.volume = v;
      store.setRadio({ volume: v });
      return;
    }
    case "favorite": {
      const on = favorites.some((f) => f.id === cmd.station.id);
      store.setRadio({
        favorites: on ? favorites.filter((f) => f.id !== cmd.station.id) : [...favorites, cmd.station],
      });
      return;
    }
    case "addCustom": {
      const url = cmd.url.trim();
      if (!isHttp(url)) return;
      const station: Station = {
        id: `custom:${Date.now().toString(36)}`,
        name: cmd.name.trim() || new URL(url).hostname,
        url,
        favicon: null,
        country: null,
        countryCode: null,
        language: null,
        tags: [],
        codec: null,
        bitrate: null,
      };
      store.setRadio({ favorites: [...favorites, station] });
      return;
    }
    case "remove":
      store.setRadio({ favorites: favorites.filter((f) => f.id !== cmd.id) });
      return;
    case "move": {
      const at = favorites.findIndex((f) => f.id === cmd.id);
      const to = at + cmd.by;
      if (at < 0 || to < 0 || to >= favorites.length) return;
      const list = [...favorites];
      [list[at], list[to]] = [list[to], list[at]];
      store.setRadio({ favorites: list });
      return;
    }
  }
}

/**
 * Mounted once, in the manager's runtime: takes commands from the other
 * windows, answers their hellos, and re-announces whenever favorites or the
 * volume change from inside the manager itself.
 */
export function useRadioHost() {
  useEffect(() => {
    const unStore = useApp.subscribe((s, prev) => {
      if (s.radio !== prev.radio) changed();
    });
    if (!isTauri()) return unStore;

    let alive = true;
    const offs: (() => void)[] = [];
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const a = await listen<RadioCmd>(RADIO_EVT.cmd, (e) => handleRadio(e.payload));
      const b = await listen(RADIO_EVT.hello, () => changed());
      if (alive) offs.push(a, b);
      else (a(), b());
      // windows that opened before the manager was listening
      changed();
    });
    return () => {
      alive = false;
      unStore();
      offs.forEach((off) => off());
    };
  }, []);
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

/** The radio's state for the manager's own UI, without a round trip through events. */
export const useRadioLocal = () => useSyncExternalStore(subscribe, current);
