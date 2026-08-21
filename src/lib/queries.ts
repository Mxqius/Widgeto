import { QueryClient, useQuery } from "@tanstack/react-query";
import { fetchMarkets, fetchWeather, type Asset, type Weather } from "./data";
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

export function useWeather(place: string) {
  const q = useQuery({
    queryKey: ["weather", place],
    queryFn: () => fetchWeather(place),
    enabled: isTauri(),
    refetchInterval: 10 * 60_000,
  });
  return {
    data: q.data ?? SAMPLE_WEATHER,
    live: !!q.data,
    source: q.data?.source,
    refetch: q.refetch,
  };
}

export function useMarkets(symbols: string[]) {
  const key = symbols.join(",");
  const q = useQuery({
    queryKey: ["markets", key],
    queryFn: () => fetchMarkets(key.split(",")),
    enabled: isTauri(),
    refetchInterval: 60_000,
  });
  return {
    assets: q.data?.assets?.length ? q.data.assets : SAMPLE_ASSETS,
    live: !!q.data?.assets?.length,
    source: q.data?.source,
    refetch: q.refetch,
  };
}
