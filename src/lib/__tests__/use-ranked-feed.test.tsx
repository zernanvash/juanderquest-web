import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { useRankedFeed } from '../use-ranked-feed';

describe('Plan 123b: useRankedFeed impressions + refresh_seed', () => {
  type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;
  let observerCallbacks: ObserverCallback[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    observerCallbacks = [];

    class MockIntersectionObserver {
      constructor(cb: ObserverCallback) {
        observerCallbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 'spot-web-1',
              slug: 'spot-web-1',
              name: 'Web Spot 1',
              description: 'Desc',
              category: 'nature_outdoors',
              municipality: 'Bolinao',
              gps_lat: 16.0,
              gps_lng: 120.0,
              price_level: 0,
              tags: [],
              amenities: [],
              trust_level: 'editorial',
              status: 'published',
              feed_score: 0.9,
              recommendation_reasons: ['Explore Bolinao'],
              crowd_status: 'quiet',
              crowd_confidence: 'high',
              saved: false,
              liked: false,
              like_count: 0,
            },
          ],
          cursor: 'next-1',
          has_more: true,
        },
      },
    } as never);
    vi.spyOn(api, 'post').mockResolvedValue({ status: 204 } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('batches impressions for signed-in users after 1s dwell + 5s flush and rotates refresh_seed on refresh', async () => {
    const { result } = renderHook(() => useRankedFeed('user-123'));
    await act(async () => {
      await Promise.resolve();
    });

    const el = document.createElement('article');
    act(() => {
      result.current.observeCard('spot-web-1')(el);
    });

    // Simulate 50% visible for 1s + 5s flush
    act(() => {
      for (const cb of observerCallbacks) {
        cb([{ target: el, isIntersecting: true, intersectionRatio: 0.75 } as unknown as IntersectionObserverEntry]);
      }
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(api.post).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(api.post).toHaveBeenCalledWith('/spots/impressions', { spot_ids: ['spot-web-1'] });

    // Explicit refresh sends a new refresh_seed
    const firstSeed = (api.get as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].params.refresh_seed;
    vi.advanceTimersByTime(5);
    await act(async () => {
      await result.current.loadSpots();
    });
    const secondSeed = (api.get as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1].params.refresh_seed;
    expect(firstSeed).toBeTruthy();
    expect(secondSeed).toBeTruthy();
    expect(secondSeed).not.toBe(firstSeed);
  });

  it('skips impression observation and POST /spots/impressions for guests', async () => {
    const { result } = renderHook(() => useRankedFeed('guest'));
    await act(async () => {
      await Promise.resolve();
    });

    const el = document.createElement('article');
    act(() => {
      result.current.observeCard('spot-web-1')(el);
      vi.advanceTimersByTime(10000);
    });

    expect(api.post).not.toHaveBeenCalled();
  });
});
