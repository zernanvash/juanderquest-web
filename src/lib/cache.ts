/**
 * Zero-dependency Stale-While-Revalidate (SWR) In-Memory Cache & Request Deduplication
 *
 * Provides:
 * - Instant cache-first rendering (zero loading flash on repeated navigation)
 * - Automatic background revalidation
 * - In-flight request deduplication (prevents duplicate simultaneous network calls)
 * - Configurable TTL (Time-To-Live)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export interface CacheOptions {
  /** Time in ms that cached data is considered fresh before revalidating (default: 60,000ms = 1 min) */
  ttlMs?: number;
  /** Force network bypass and refresh cache */
  forceRefresh?: boolean;
}

export async function fetchWithCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; fromCache: boolean }> {
  const { ttlMs = 60_000, forceRefresh = false } = options;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

  // 1. If cached and still valid (and not forcing refresh), return immediately
  if (!forceRefresh && cached && now - cached.timestamp < ttlMs) {
    return { data: cached.data, fromCache: true };
  }

  // 2. If an identical request is already in-flight, reuse its Promise (deduplication)
  if (inFlightRequests.has(cacheKey)) {
    const data = (await inFlightRequests.get(cacheKey)) as T;
    return { data, fromCache: false };
  }

  // 3. Initiate new fetch with in-flight tracking
  const requestPromise = (async () => {
    try {
      const result = await fetcher();
      memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  const data = await requestPromise;

  return { data, fromCache: false };
}

/**
 * Invalidate a specific cache key or keys matching a prefix
 */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get synchronously from cache if available (for instantaneous UI render)
 */
export function getCachedValue<T>(cacheKey: string): T | undefined {
  const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
  return cached?.data;
}
