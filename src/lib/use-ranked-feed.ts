'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, normalizeSpot, SpotModel } from './api';

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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (reset = false) => {
    if (pending.current && !reset) return;
    if (reset) { pending.current?.abort(); generation.current++; cursor.current = null; setExpired(false); }
    const current = generation.current;
    const controller = new AbortController();
    pending.current = controller;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const res = await api.get('/feed', {
        params: { cursor: reset ? undefined : cursor.current, limit: 10 }, signal: controller.signal,
      });
      if (!res.data?.success || !Array.isArray(res.data.data?.items)) throw new Error('Invalid feed');
      if (controller.signal.aborted || current !== generation.current) return;
      const incoming = (res.data.data.items as Parameters<typeof normalizeSpot>[0][]).map(normalizeSpot);
      setSpots(previous => {
        const base = reset ? [] : previous;
        const seen = new Set(base.map(item => item.id));
        return [...base, ...incoming.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })];
      });
      cursor.current = res.data.data.cursor || null;
      setHasMore(Boolean(res.data.data.has_more));
    } catch (cause) {
      if (controller.signal.aborted || current !== generation.current) return;
      const isExpired = (cause as { response?: { data?: { error?: { code?: string } } } })
        .response?.data?.error?.code === 'INVALID_CURSOR';
      setExpired(isExpired);
      setError(isExpired ? 'Refresh the feed to continue discovering posts.' : 'Could not load posts. Please try again.');
    } finally {
      if (pending.current === controller) { pending.current = null; setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    setSpots([]);
    void fetchPage(true);
    return () => { generation.current++; pending.current?.abort(); pending.current = null; };
  }, [identity, fetchPage]);

  // Desktop scrolls the middle column; mobile scrolls the document.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || error || !hasMore) return;
    const observe = () => {
      const root = feedRef.current && getComputedStyle(feedRef.current).overflowY === 'auto'
        ? feedRef.current : null;
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) void fetchPage();
      }, { root, rootMargin: '0px 0px 500px 0px' });
      observer.observe(sentinel);
      return observer;
    };
    let observer = observe();
    const resize = () => { observer.disconnect(); observer = observe(); };
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
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

  return { spots, loading, loadingMore, error, hasMore, expired, sentinelRef, feedRef,
    loadSpots: () => fetchPage(true), handleLoadMore: () => fetchPage(expired) };
}
