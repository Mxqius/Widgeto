import { isTauri } from "@/shared/lib/env";

/**
 * The data layer is Rust: every call below is a Tauri command, so there is no
 * HTTP server, no port and no CORS. Outside Tauri (plain `npm run dev`) the
 * commands do not exist, and the hooks fall back to sample data.
 */
export type Source = "live" | "cache" | "stale";

/** Every command returns its payload flattened alongside cache provenance. */
type Fetched<T> = T & { source: Source; age: number };

export interface Weather {
  place: string;
  country: string | null;
  tempC: number;
  feelsC: number;
  humidity: number;
  windKph: number;
  condition: string;
  icon: "sun" | "part" | "cloud" | "rain" | "snow" | "storm";
  forecast: { day: string; icon: Weather["icon"]; hiC: number; loC: number }[];
}

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export interface Markets {
  assets: Asset[];
  supported: string[];
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("offline: data commands need the desktop app");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export const fetchWeather = (place: string) => call<Fetched<Weather>>("weather", { place });

export const fetchMarkets = (symbols: string[]) => call<Fetched<Markets>>("markets", { symbols });

export const fetchQuote = () => call<{ text: string; who: string }>("quote");

export const fetchHealth = () => call<{ ok: boolean; cached: number }>("data_health");

/* ------------------------------------------------------------ local system */

export interface SystemStats {
  cpu: number;
  cpuCores: number[];
  memUsed: number;
  memTotal: number;
  memPct: number;
  diskUsed: number;
  diskTotal: number;
  diskPct: number;
  uptimeSec: number;
  hostName: string | null;
}

export interface NetStats {
  downBps: number;
  upBps: number;
  totalRx: number;
  totalTx: number;
}

export interface BatteryStats {
  present: boolean;
  percent: number;
  charging: boolean;
  full: boolean;
  secsLeft: number | null;
  health: number | null;
  tempC: number | null;
}

export interface MediaNow {
  playing: boolean;
  title: string | null;
  artist: string | null;
  album: string | null;
  app: string | null;
  positionSec: number | null;
  durationSec: number | null;
  /** null when the player does not report it */
  shuffle?: boolean | null;
  repeat?: "none" | "track" | "list" | null;
  /** what the player allows; null means it did not say */
  canSeek?: boolean | null;
  canShuffle?: boolean | null;
  canRepeat?: boolean | null;
  canNext?: boolean | null;
  canPrev?: boolean | null;
}

export const fetchSystem = () => call<SystemStats>("system_stats");
export const fetchNet = () => call<NetStats>("net_stats");
export const fetchBattery = () => call<BatteryStats>("battery_stats");
export const fetchMedia = () => call<MediaNow>("media_now");

export type MediaAction = "play" | "pause" | "toggle" | "next" | "prev" | "shuffle" | "repeat";

export const mediaControl = (action: MediaAction) => call<void>("media_control", { action });

/** Jump the playhead to `seconds` into the current track. */
export const mediaSeek = (seconds: number) => call<void>("media_seek", { seconds });

/* ---------------------------------------------------------------- volume */

export interface Volume {
  /** 0 – 1 */
  level: number;
  muted: boolean;
}

export const fetchVolume = () => call<Volume>("volume_get");
export const setVolume = (level: number) => call<Volume>("volume_set", { level });
export const setMuted = (muted: boolean) => call<Volume>("volume_mute", { muted });

/** Opens a URL, a file, a folder or an executable. */
export const launch = (target: string) => call<void>("launch", { target });

/* -------------------------------------------------------------- calendar */

export interface CalEvent {
  summary: string;
  location: string | null;
  /** YYYY-MM-DD */
  date: string;
  startMin: number | null;
  endMin: number | null;
  allDay: boolean;
  calendar: string;
}

export const fetchEvents = (paths: string[], days: number) =>
  call<CalEvent[]>("calendar_events", { paths, days });
