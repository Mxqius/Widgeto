import { useContext, useRef } from "react";
import { PrefsContext } from "@/widgets/prefs";
import { QueryClient, useQuery } from "@tanstack/react-query";
import {
  fetchBattery,
  fetchMarkets,
  fetchMedia,
  fetchNet,
  fetchSystem,
  fetchWeather,
  type Asset,
  type BatteryStats,
  type MediaNow,
  type NetStats,
  type SystemStats,
  type Weather,
  fetchEvents,
  type CalEvent,
} from "./data";
import { isTauri } from "./utils";

/**
 * One client per window. Widgets are long-lived and mostly idle, so the
 * defaults lean on cached data and let the interval drive refreshes rather
 * than refetching on every focus change.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        retryDelay: 2000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // the Rust side caches too; this just avoids redundant invokes
        staleTime: 30_000,
        gcTime: 60 * 60_000,
      },
    },
  });
}

/** Shown until the command answers, and kept if it never does. */
export const SAMPLE_WEATHER: Weather = {
  place: "Amsterdam",
  country: "NL",
  tempC: 21,
  feelsC: 20,
  humidity: 38,
  windKph: 11,
  condition: "partly cloudy",
  icon: "part",
  forecast: [],
};

export const SAMPLE_ASSETS: Asset[] = [
  { symbol: "BTC", name: "bitcoin", price: 94_210, change24h: 2.4 },
  { symbol: "ETH", name: "ethereum", price: 3_182, change24h: -1.1 },
  { symbol: "SOL", name: "solana", price: 188.4, change24h: 0.8 },
];

export function useWeather(place: string, sec = 600) {
  const slow = useSlowdown();
  const q = useQuery({
    queryKey: ["weather", place],
    queryFn: () => fetchWeather(place),
    enabled: isTauri(),
    refetchInterval: sec * 1000 * slow,
  });
  return {
    data: q.data ?? SAMPLE_WEATHER,
    live: !!q.data,
    source: q.data?.source,
    refetch: q.refetch,
  };
}

export function useMarkets(symbols: string[], sec = 60) {
  const slow = useSlowdown();
  const key = symbols.join(",");
  const q = useQuery({
    queryKey: ["markets", key],
    queryFn: () => fetchMarkets(key.split(",")),
    enabled: isTauri(),
    refetchInterval: sec * 1000 * slow,
  });
  return {
    assets: q.data?.assets?.length ? q.data.assets : SAMPLE_ASSETS,
    live: !!q.data?.assets?.length,
    source: q.data?.source,
    refetch: q.refetch,
  };
}

/* --------------------------------------------------- live machine readings */

/**
 * How much to stretch every interval.
 *
 * The battery state arrives with the widget's config rather than being polled
 * here: this hook runs in all thirteen windows, and having each of them ask
 * the battery how it is doing would burn more power than the feature saves.
 */
export function useSlowdown(): number {
  const { powerSaver, onBattery } = useContext(PrefsContext);
  if (powerSaver === "always") return 4;
  if (powerSaver === "onBattery" && onBattery) return 4;
  return 1;
}

/** Local probes are cheap and want to look live, so they poll on a short beat. */
function useLocal<T>(key: string, fn: () => Promise<T>, seconds: number) {
  const slow = useSlowdown();
  return useQuery({
    queryKey: [key],
    queryFn: fn,
    enabled: isTauri(),
    refetchInterval: Math.max(500, seconds * 1000 * slow),
    staleTime: 0,
    retry: 0,
  });
}

export const useSystem = (sec = 2) => useLocal<SystemStats>("system", fetchSystem, sec);
export const useNet = (sec = 2) => useLocal<NetStats>("net", fetchNet, sec);
export const useBattery = (sec = 20) => useLocal<BatteryStats>("battery", fetchBattery, sec);
export const useMedia = (sec = 2) => useLocal<MediaNow>("media", fetchMedia, sec);

/**
 * Keeps the last N readings so a widget can draw a trend. Query results are
 * point-in-time, so the history lives here rather than in each widget.
 */
export function useTrail(value: number | undefined, len = 28) {
  const trail = useRef<number[]>([]);
  if (value !== undefined && Number.isFinite(value)) {
    const last = trail.current[trail.current.length - 1];
    if (last !== value || trail.current.length < 2) {
      trail.current = [...trail.current, value].slice(-len);
    }
  }
  return trail.current.length ? trail.current : [0];
}

/** Local .ics files change rarely; re-read them every few minutes. */
export function useEvents(paths: string[], days: number) {
  const key = paths.join("|");
  const q = useQuery({
    queryKey: ["events", key, days],
    queryFn: () => fetchEvents(key ? key.split("|") : [], days),
    enabled: isTauri() && paths.length > 0,
    refetchInterval: 5 * 60_000,
  });
  return { events: (q.data ?? []) as CalEvent[], loading: q.isLoading };
}
