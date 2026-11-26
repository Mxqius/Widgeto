import { useQuery } from "@tanstack/react-query";
import {
  fetchBattery,
  fetchMedia,
  fetchNet,
  fetchSystem,
  type BatteryStats,
  type MediaNow,
  type NetStats,
  type SystemStats,
} from "@/shared/ipc/commands";
import { isTauri } from "@/shared/lib/env";
import { useSlowdown } from "../lib/useSlowdown";

/**
 * Local probes are cheap and want to look live, so they poll on a short beat.
 *
 * React Query stops the interval by itself while the document is hidden, which
 * is what pauses these for an occluded widget; `refetchOnWindowFocus` then
 * gives an immediate reading the moment the tile is visible again rather than
 * showing whatever was on screen when it was covered.
 */
function usePolled<T>(key: string, fn: () => Promise<T>, seconds: number) {
  const slow = useSlowdown();
  return useQuery({
    queryKey: [key],
    queryFn: fn,
    enabled: isTauri(),
    refetchInterval: Math.max(500, seconds * 1000 * slow),
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 0,
  });
}

export const useSystem = (sec = 2) => usePolled<SystemStats>("system", fetchSystem, sec);
export const useNet = (sec = 2) => usePolled<NetStats>("net", fetchNet, sec);
export const useBattery = (sec = 20) => usePolled<BatteryStats>("battery", fetchBattery, sec);
export const useMedia = (sec = 2) => usePolled<MediaNow>("media", fetchMedia, sec);
