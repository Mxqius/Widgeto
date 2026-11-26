import { QueryClient } from "@tanstack/react-query";

/**
 * One client per window. Widgets are long-lived and mostly idle, so the
 * defaults lean on cached data and let the interval drive refreshes.
 *
 * Each window holds a handful of fixed keys, so `gcTime` only needs to outlast
 * a brief remount — an hour was holding results long after anything could read
 * them.
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
        gcTime: 5 * 60_000,
      },
    },
  });
}
