import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWithCache,
  invalidateCache,
  normalizeQueryKey,
  subscribeToCache,
  getCachedValue,
} from './cache';

describe('Stale-While-Revalidate Cache & Deduplication', () => {
  beforeEach(() => {
    invalidateCache();
    vi.clearAllMocks();
  });

  it('normalizes query keys consistently regardless of parameter order', () => {
    const key1 = normalizeQueryKey('spots', { category: 'nature', q: 'beach' });
    const key2 = normalizeQueryKey('spots', { q: 'beach', category: 'nature' });
    expect(key1).toBe(key2);
    expect(key1).toBe('spots?category=nature&q=beach');
  });

  it('ignores empty, null, or undefined parameters in query keys', () => {
    const key = normalizeQueryKey('spots', { category: 'all', q: '', page: undefined });
    expect(key).toBe('spots?category=all');
  });

  it('deduplicates simultaneous in-flight requests to prevent dogpiling', async () => {
    let callCount = 0;
    const slowFetcher = vi.fn(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return { id: 1, name: 'Patar Beach' };
    });

    const [res1, res2, res3] = await Promise.all([
      fetchWithCache('spot_patar', slowFetcher),
      fetchWithCache('spot_patar', slowFetcher),
      fetchWithCache('spot_patar', slowFetcher),
    ]);

    expect(callCount).toBe(1);
    expect(res1.data).toEqual({ id: 1, name: 'Patar Beach' });
    expect(res2.data).toEqual({ id: 1, name: 'Patar Beach' });
    expect(res3.data).toEqual({ id: 1, name: 'Patar Beach' });
  });

  it('serves cached data immediately when within TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue(['spot-1', 'spot-2']);

    const first = await fetchWithCache('spots_list', fetcher, { ttlMs: 10_000 });
    expect(first.fromCache).toBe(false);
    expect(first.isStale).toBe(false);

    const second = await fetchWithCache('spots_list', fetcher, { ttlMs: 10_000 });
    expect(second.fromCache).toBe(true);
    expect(second.isStale).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('performs Stale-While-Revalidate when data exceeds TTL', async () => {
    let count = 1;
    const fetcher = vi.fn(async () => `version-${count++}`);

    // Initial fetch
    const initial = await fetchWithCache('versioned', fetcher, { ttlMs: 20 });
    expect(initial.data).toBe('version-1');

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 30));

    // Stale fetch should return version-1 immediately with isStale: true
    const staleResult = await fetchWithCache('versioned', fetcher, { ttlMs: 20 });
    expect(staleResult.fromCache).toBe(true);
    expect(staleResult.isStale).toBe(true);
    expect(staleResult.data).toBe('version-1');

    // Wait for background revalidation to settle
    await new Promise((r) => setTimeout(r, 20));

    // Next read should have the fresh version-2
    const fresh = getCachedValue<string>('versioned');
    expect(fresh).toBe('version-2');
  });

  it('retains stale data when background revalidation throws an error', async () => {
    let fail = false;
    const fetcher = vi.fn(async () => {
      if (fail) throw new Error('Network timeout');
      return 'good-data';
    });

    await fetchWithCache('stable_key', fetcher, { ttlMs: 20 });

    // Expire TTL
    await new Promise((r) => setTimeout(r, 30));

    // Trigger failure in background
    fail = true;
    const result = await fetchWithCache('stable_key', fetcher, { ttlMs: 20 });
    expect(result.data).toBe('good-data');

    // Stale data remains intact in cache
    expect(getCachedValue('stable_key')).toBe('good-data');
  });

  it('notifies subscribers when background revalidation resolves', async () => {
    let value = 'initial';
    const fetcher = vi.fn(async () => value);

    await fetchWithCache('sub_test', fetcher, { ttlMs: 20 });

    const subscriber = vi.fn();
    const unsubscribe = subscribeToCache('sub_test', subscriber);

    // Expire and revalidate with new value
    await new Promise((r) => setTimeout(r, 30));
    value = 'updated';

    await fetchWithCache('sub_test', fetcher, { ttlMs: 20 });
    await new Promise((r) => setTimeout(r, 20));

    expect(subscriber).toHaveBeenCalledWith('updated');
    unsubscribe();
  });
});
