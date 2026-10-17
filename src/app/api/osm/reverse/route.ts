import { NextRequest, NextResponse } from 'next/server';
import { PHILIPPINE_GPS_BOUNDS } from '@/lib/spot-posting';
import {
  mapNominatimReverse,
  getNearestAreaFallback,
  type ReverseSuggestion,
  type NominatimReverseResponse,
} from '@/lib/reverse-geocode';

interface CacheEntry {
  timestamp: number;
  data: ReverseSuggestion;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 2000;

// Rate limiting: at most 1 request per second to Nominatim upstream
let lastRequestTime = 0;
let queuePromise: Promise<void> = Promise.resolve();

function throttleUpstream(): Promise<void> {
  queuePromise = queuePromise.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
    }
    lastRequestTime = Date.now();
  });
  return queuePromise;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'lat and lng parameters are required' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng must be valid finite numbers' }, { status: 400 });
  }

  if (
    lat < PHILIPPINE_GPS_BOUNDS.minLat ||
    lat > PHILIPPINE_GPS_BOUNDS.maxLat ||
    lng < PHILIPPINE_GPS_BOUNDS.minLng ||
    lng > PHILIPPINE_GPS_BOUNDS.maxLng
  ) {
    return NextResponse.json(
      { error: 'Coordinates must be within the Philippine boundaries' },
      { status: 400 }
    );
  }

  // Key rounded to 4 decimals (~11 meters resolution)
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ suggestion: cached.data });
  }

  try {
    await throttleUpstream();

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JuanDerQuest/1.0 (travel@juanderquest.app; +https://juanderquest.app)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      // Graceful fallback on upstream rate-limit or error
      const fallback = getNearestAreaFallback(lat, lng);
      return NextResponse.json({ suggestion: fallback, source: 'fallback-nearest' });
    }

    const rawData = (await res.json()) as NominatimReverseResponse;
    const suggestion = mapNominatimReverse(rawData, lat, lng);

    // Cache management: LRU eviction if oversized
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, { timestamp: now, data: suggestion });

  } catch {
    // Return nearest known area fallback gracefully on network timeout or exception
    const fallback = getNearestAreaFallback(lat, lng);
    return NextResponse.json({ suggestion: fallback, source: 'fallback-timeout' });
  }
}
