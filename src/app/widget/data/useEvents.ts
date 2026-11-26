import { useQuery } from "@tanstack/react-query";
import { fetchEvents, type CalEvent } from "@/shared/ipc/commands";
import { isTauri } from "@/shared/lib/env";

const EMPTY: CalEvent[] = [];

/** Local .ics files change rarely; re-read them every few minutes. */
export function useEvents(paths: string[], days: number) {
  const key = paths.join("|");
  const q = useQuery({
    queryKey: ["events", key, days],
    queryFn: () => fetchEvents(key ? key.split("|") : [], days),
    enabled: isTauri() && paths.length > 0,
    refetchInterval: 5 * 60_000,
  });
  return { events: q.data ?? EMPTY, loading: q.isLoading };
}
