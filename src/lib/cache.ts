/**
 * Zero-dependency Stale-While-Revalidate (SWR) In-Memory Cache & Request Deduplication
 *
 * Provides:
 * - Instant cache-first rendering (returns stale data immediately while updating in background)
 * - Automatic background revalidation without destroying stale data on network failure
 * - In-flight request deduplication (prevents duplicate simultaneous network calls)
 * - Configurable TTL (Time-To-Live) and max cache size
 * - Reactive cache subscriptions for instant UI updates when background refresh resolves
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type CacheListener<T> = (data: T) => void;

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<CacheListener<unknown>>>();
const MAX_CACHE_ENTRIES = 200;

export interface CacheOptions {
  /** Time in ms that cached data is considered fresh before background revalidating (default: 60,000ms = 1 min) */
  ttlMs?: number;
  /** Force network bypass and refresh cache */
  forceRefresh?: boolean;
}

/**
 * Normalizes query keys to prevent duplicate caches for equivalent parameters
 */
export function normalizeQueryKey(domain: string, params: Record<string, string | number | boolean | undefined | null> = {}): string {
  const sortedEntries = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim().toLowerCase())}`);

  return sortedEntries.length ? `${domain}?${sortedEntries.join('&')}` : domain;
}

/**
 * Executes a fetch with true Stale-While-Revalidate semantics.
 * If cached data exists (even if stale), returns immediately and revalidates in the background.
 */
export async function fetchWithCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
  const { ttlMs = 60_000, forceRefresh = false } = options;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

  // Background revalidation trigger
  const triggerRevalidation = () => {
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }

    const revalidationPromise = (async () => {
      try {
        const freshData = await fetcher();
        setCacheValue(cacheKey, freshData);
        notifySubscribers(cacheKey, freshData);
        return freshData;
      } catch (err) {
        // Retain cached data on background failure
        return cached?.data as T;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, revalidationPromise);
    return revalidationPromise;
  };

  // 1. If cached data is available and we aren't forcing an immediate blocking refresh
  if (cached && !forceRefresh) {
    const isStale = now - cached.timestamp >= ttlMs;
    if (isStale) {
      // Stale-While-Revalidate: fire revalidation in background, return stale immediately
      void triggerRevalidation();
    }
    return { data: cached.data, fromCache: true, isStale };
  }

  // 2. If an identical request is already in-flight, reuse its Promise (deduplication)
  if (inFlightRequests.has(cacheKey)) {
    const data = (await inFlightRequests.get(cacheKey)) as T;
    return { data, fromCache: false, isStale: false };
  }

  // 3. Initiate new fetch (cold cache or forced refresh)
  const freshPromise = (async () => {
    try {
      const result = await fetcher();
      setCacheValue(cacheKey, result);
      notifySubscribers(cacheKey, result);
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, freshPromise);
  const data = await freshPromise;

  return { data, fromCache: false, isStale: false };
}

/**
 * Stores a value in memory cache with LRU pruning when size exceeds threshold
 */
export function setCacheValue<T>(cacheKey: string, data: T): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES && !memoryCache.has(cacheKey)) {
    // Evict oldest entry
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(cacheKey, { data, timestamp: Date.now() });
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

/**
 * Subscribe to background cache updates for a given key
 */
export function subscribeToCache<T>(cacheKey: string, listener: CacheListener<T>): () => void {
  if (!listeners.has(cacheKey)) {
    listeners.set(cacheKey, new Set());
  }
  const set = listeners.get(cacheKey)!;
  set.add(listener as CacheListener<unknown>);

  return () => {
    set.delete(listener as CacheListener<unknown>);
    if (set.size === 0) {
      listeners.delete(cacheKey);
    }
  };
}

function notifySubscribers<T>(cacheKey: string, data: T): void {
  const set = listeners.get(cacheKey);
  if (set) {
    set.forEach((listener) => {
      try {
        listener(data);
      } catch {
        // Safeguard subscriber execution
      }
    });
  }
}
