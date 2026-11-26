'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, normalizeSpot, SpotModel } from './api';

const IMPRESSION_DWELL_MS = 1000;
const IMPRESSION_FLUSH_MS = 5000;
const IMPRESSION_FLUSH_COUNT = 10;
const IMPRESSION_MAX_BATCH = 30;

function makeRefreshSeed(): string {
  return `rs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useRankedFeed(identity: string) {
  const [spots, setSpots] = useState<SpotModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [expired, setExpired] = useState(false);
  const cursor = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const refreshSeedRef = useRef<string>(makeRefreshSeed());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const isSignedIn = Boolean(identity && identity !== 'guest');
  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;

  // Impression batcher state (signed-in users only)
  const queuedIdsRef = useRef<Set<string>>(new Set());
  const reportedIdsRef = useRef<Set<string>>(new Set());
  const dwellTimersRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const refCallbacksRef = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());

  const flushImpressions = useCallback(() => {
    if (flushTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const queued = queuedIdsRef.current;
    if (queued.size === 0) return;
    if (!isSignedInRef.current) {
      queued.clear();
      return;
    }
    const batch = Array.from(queued).slice(0, IMPRESSION_MAX_BATCH);
    for (const id of batch) {
      queued.delete(id);
      reportedIdsRef.current.add(id);
    }
    // Fire-and-forget; never retry on failure.
    void api.post('/spots/impressions', { spot_ids: batch }).catch(() => {});

    if (queued.size > 0 && typeof window !== 'undefined') {
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flushImpressions();
      }, IMPRESSION_FLUSH_MS);
    }
  }, []);

  const enqueueImpression = useCallback(
    (spotId: string) => {
      dwellTimersRef.current.delete(spotId);
      if (!isSignedInRef.current || reportedIdsRef.current.has(spotId)) return;
      const queued = queuedIdsRef.current;
      if (queued.has(spotId)) return;
      queued.add(spotId);
      if (queued.size >= IMPRESSION_FLUSH_COUNT) {
        flushImpressions();
      } else if (flushTimerRef.current === null && typeof window !== 'undefined') {
        flushTimerRef.current = window.setTimeout(() => {
          flushTimerRef.current = null;
          flushImpressions();
        }, IMPRESSION_FLUSH_MS);
      }
    },
    [flushImpressions],
  );

  useEffect(() => {
    if (!isSignedIn || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const root = feedRef.current && getComputedStyle(feedRef.current).overflowY === 'auto' ? feedRef.current : null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const spotId = (entry.target as HTMLElement).dataset.spotId;
          if (!spotId) continue;
          const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
          if (isVisible) {
            if (
              reportedIdsRef.current.has(spotId) ||
              queuedIdsRef.current.has(spotId) ||
              dwellTimersRef.current.has(spotId)
            ) {
              continue;
            }
            const timerId = window.setTimeout(() => enqueueImpression(spotId), IMPRESSION_DWELL_MS);
            dwellTimersRef.current.set(spotId, timerId);
          } else {
            const existing = dwellTimersRef.current.get(spotId);
            if (existing !== undefined) {
              window.clearTimeout(existing);
              dwellTimersRef.current.delete(spotId);
            }
          }
        }
      },
      { root, threshold: 0.5 },
    );

    observerRef.current = observer;
    for (const el of observedElsRef.current.values()) {
      observer.observe(el);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushImpressions();
    };
    const handlePageHide = () => flushImpressions();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    const dwellTimers = dwellTimersRef.current;
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      observer.disconnect();
      observerRef.current = null;
      for (const id of dwellTimers.values()) window.clearTimeout(id);
      dwellTimers.clear();
      flushImpressions();
    };
  }, [isSignedIn, enqueueImpression, flushImpressions]);

  const observeCard = useCallback((spotId: string) => {
    let cb = refCallbacksRef.current.get(spotId);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        const prev = observedElsRef.current.get(spotId);
        if (prev && prev !== el) {
          observerRef.current?.unobserve(prev);
          observedElsRef.current.delete(spotId);
        }
        if (el) {
          el.dataset.spotId = spotId;
          observedElsRef.current.set(spotId, el);
          observerRef.current?.observe(el);
        } else {
          const timer = dwellTimersRef.current.get(spotId);
          if (timer !== undefined && typeof window !== 'undefined') {
            window.clearTimeout(timer);
            dwellTimersRef.current.delete(spotId);
          }
        }
      };
      refCallbacksRef.current.set(spotId, cb);
    }
    return cb;
  }, []);

  const fetchPage = useCallback(async (reset = false) => {
    if (pending.current && !reset) return;
    if (reset) {
      pending.current?.abort();
      generation.current++;
      cursor.current = null;
      refreshSeedRef.current = makeRefreshSeed();
      setExpired(false);
    }
    const current = generation.current;
    const controller = new AbortController();
    pending.current = controller;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const res = await api.get('/feed', {
        params: {
          cursor: reset ? undefined : cursor.current,
          limit: 10,
          refresh_seed: refreshSeedRef.current,
        },
        signal: controller.signal,
      });
      if (!res.data?.success || !Array.isArray(res.data.data?.items)) throw new Error('Invalid feed');
      if (controller.signal.aborted || current !== generation.current) return;
      const incoming = (res.data.data.items as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
      setSpots((previous) => {
        const base = reset ? [] : previous;
        const seen = new Set(base.map((item) => item.id));
        return [
          ...base,
          ...incoming.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          }),
        ];
      });
      cursor.current = res.data.data.cursor || null;
      setHasMore(Boolean(res.data.data.has_more));
    } catch (cause) {
      if (controller.signal.aborted || current !== generation.current) return;
      const isExpired =
        (cause as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code ===
        'INVALID_CURSOR';
      setExpired(isExpired);
      setError(
        isExpired ? 'Refresh the feed to continue discovering posts.' : 'Could not load posts. Please try again.',
      );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    setSpots([]);
    void fetchPage(true);
    return () => {
      generation.current++;
      pending.current?.abort();
      pending.current = null;
    };
  }, [identity, fetchPage]);

  useEffect(() => {
    const handlePreviewChange = () => {
      setSpots([]);
      void fetchPage(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('jdq:preview-mode-changed', handlePreviewChange);
      return () => {
        window.removeEventListener('jdq:preview-mode-changed', handlePreviewChange);
      };
    }
  }, [fetchPage]);

  // Desktop scrolls the middle column; mobile scrolls the document.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || error || !hasMore) return;
    const observe = () => {
      const root = feedRef.current && getComputedStyle(feedRef.current).overflowY === 'auto' ? feedRef.current : null;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) void fetchPage();
        },
        { root, rootMargin: '0px 0px 500px 0px' },
      );
      observer.observe(sentinel);
      return observer;
    };
    let observer = observe();
    const resize = () => {
      observer.disconnect();
      observer = observe();
    };
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [loading, loadingMore, error, hasMore, spots.length, fetchPage]);

  // At the end, check for newly eligible ranked posts only while the reader is nearby.
  useEffect(() => {
    if (hasMore || loading || error) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      const pane = feedRef.current?.getBoundingClientRect();
      if (rect.top < Math.min(window.innerHeight, pane?.bottom ?? window.innerHeight) + 500 && rect.bottom > 0)
        void fetchPage();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [hasMore, loading, error, fetchPage]);

  return {
    spots,
    loading,
    loadingMore,
    error,
    hasMore,
    expired,
    sentinelRef,
    feedRef,
    observeCard,
    flushImpressions,
    loadSpots: () => fetchPage(true),
    handleLoadMore: () => fetchPage(expired),
  };
}
