import { isTauri } from "./utils";

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
}

export const fetchSystem = () => call<SystemStats>("system_stats");
export const fetchNet = () => call<NetStats>("net_stats");
export const fetchBattery = () => call<BatteryStats>("battery_stats");
export const fetchMedia = () => call<MediaNow>("media_now");

export const mediaControl = (action: "play" | "pause" | "toggle" | "next" | "prev") =>
  call<void>("media_control", { action });

/** Opens a URL, a file, a folder or an executable. */
export const launch = (target: string) => call<void>("launch", { target });
