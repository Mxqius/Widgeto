import { useQuery } from "@tanstack/react-query";
import { fetchMarkets, fetchWeather, type Asset, type Weather } from "@/shared/ipc/commands";
import { isTauri } from "@/shared/lib/env";
import { useSlowdown } from "../lib/useSlowdown";

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
