/**
 * Client for the local Hono service. Every call is best-effort: if the server
 * is not running the widget falls back to its own sample data rather than
 * showing an error, so the desktop never looks broken.
 */
const DEFAULT_BASE = "http://localhost:8787";

let base = DEFAULT_BASE;
export function setApiBase(url: string) {
  base = (url || DEFAULT_BASE).replace(/\/+$/, "");
}
export function apiBase() {
  return base;
}

export async function api<T>(path: string, timeoutMs = 7000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------------- shapes */

export interface WeatherNow {
  place: string;
  country: string | null;
  tempC: number;
  feelsC: number;
  humidity: number;
  windKph: number;
  condition: string;
  icon: "sun" | "part" | "cloud" | "rain" | "snow" | "storm";
  forecast: { day: string; icon: WeatherNow["icon"]; hiC: number; loC: number }[];
}

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export const getWeather = (place: string) =>
  api<WeatherNow>(`/api/weather?q=${encodeURIComponent(place)}`);

export const getMarkets = (symbols: string[]) =>
  api<{ assets: Asset[]; supported: string[] }>(
    `/api/markets?symbols=${encodeURIComponent(symbols.join(","))}`,
  );

export const getHealth = () => api<{ ok: boolean }>("/health", 2500);
