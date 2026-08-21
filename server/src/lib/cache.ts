/**
 * Tiny TTL cache. Upstreams here are free and rate-limited, so every route
 * caches and every cached value doubles as a fallback if the upstream fails.
 */
interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export function cached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) return undefined;
  return hit.value as T;
}

/** Last known value regardless of age — used when the upstream is down. */
export function stale<T>(key: string): T | undefined {
  return store.get(key)?.value as T | undefined;
}

export function put<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/**
 * Fetch through the cache: fresh hit wins, then upstream, then a stale hit if
 * the upstream is unreachable. Only throws when there is nothing at all.
 */
export async function through<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{
  value: T;
  from: "cache" | "live" | "stale";
}> {
  const fresh = cached<T>(key);
  if (fresh !== undefined) return { value: fresh, from: "cache" };

  try {
    const value = await load();
    put(key, value, ttlMs);
    return { value, from: "live" };
  } catch (err) {
    const old = stale<T>(key);
    if (old !== undefined) return { value: old, from: "stale" };
    throw err;
  }
}

export function cacheSize() {
  return store.size;
}
