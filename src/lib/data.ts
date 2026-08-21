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
