/**
 * The radio plays in exactly one place — the manager window, the only one
 * that lives for the whole run — and every other window is a remote for it.
 * Remotes send commands; the manager answers every change with the whole
 * state, so a window that opens late only has to say hello.
 */

export const RADIO_EVT = {
  /** widget or island -> manager: do this */
  cmd: "radio:cmd",
  /** manager -> everyone: this is how things are now */
  state: "radio:state",
  /** widget or island -> manager: I just opened, tell me the state */
  hello: "radio:hello",
} as const;

/** A station, from the Radio Browser directory or added by hand. */
export interface Station {
  /** the directory's station uuid, or `custom:…` for one added by hand */
  id: string;
  name: string;
  /** the stream itself */
  url: string;
  favicon: string | null;
  country: string | null;
  /** ISO 3166 alpha-2, upper case */
  countryCode: string | null;
  language: string | null;
  tags: string[];
  codec: string | null;
  bitrate: number | null;
}

export interface RadioState {
  /** what is loaded: playing, buffering, stopped or failed */
  station: Station | null;
  playing: boolean;
  buffering: boolean;
  error: string | null;
  /** the song, when the stream says what it is playing */
  nowTitle: string | null;
  /** the stream's own volume, 0 – 1 — not the system's */
  volume: number;
  favorites: Station[];
}

export type RadioCmd =
  | { type: "play"; station: Station }
  | { type: "toggle" }
  | { type: "stop" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "volume"; volume: number }
  /** adds the station to favorites, or takes it out if it is there */
  | { type: "favorite"; station: Station }
  | { type: "addCustom"; name: string; url: string }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; by: -1 | 1 };

export const EMPTY_RADIO: RadioState = {
  station: null,
  playing: false,
  buffering: false,
  error: null,
  nowTitle: null,
  volume: 0.8,
  favorites: [],
};

/** What the directory search accepts; every field narrows it further. */
export interface RadioQuery {
  name?: string;
  countryCode?: string;
  language?: string;
  tag?: string;
  limit?: number;
}

export const isFavorite = (s: RadioState, id: string | undefined) =>
  !!id && s.favorites.some((f) => f.id === id);

/** "IR · 128 kbps" — the small print under a station's name. */
export function stationMeta(s: Station) {
  return [s.countryCode ?? s.country, s.bitrate ? `${s.bitrate} kbps` : s.codec]
    .filter(Boolean)
    .join(" · ");
}
