import { NextRequest, NextResponse } from 'next/server';
import { AreaDefinition } from '@/lib/areas';

interface CacheEntry {
  timestamp: number;
  data: AreaDefinition[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function mapOsmType(addresstype?: string, type?: string): AreaDefinition['type'] {
  const raw = (addresstype || type || '').toLowerCase();
  if (raw === 'country') return 'country';
  if (raw === 'state' || raw === 'region') return 'region';
  if (raw === 'province' || raw === 'county') return 'province';
  if (raw === 'city') return 'city';
  return 'municipality';
}

function calculateOsmZoom(type: AreaDefinition['type']): number {
  switch (type) {
    case 'country':
      return 7;
    case 'region':
      return 8;
    case 'province':
      return 10;
    case 'city':
      return 12;
    case 'municipality':
    default:
      return 13;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ areas: [] });
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ areas: cached.data });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q
    )}&format=json&countrycodes=ph&limit=4&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JuanDerQuest/1.0 (travel@juanderquest.app; +https://juanderquest.app)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      return NextResponse.json({ areas: [] });
    }

    const rawItems = (await res.json()) as Array<{
      place_id: number;
      osm_type?: string;
      osm_id?: number;
      lat: string;
      lon: string;
      addresstype?: string;
      type?: string;
      name?: string;
      display_name: string;
    }>;

    const areas: AreaDefinition[] = [];

    for (const item of rawItems) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lon)) continue;

      const areaType = mapOsmType(item.addresstype, item.type);
      const primaryName = (item.name || item.display_name.split(',')[0] || q).trim();

      // Format clean subtitle without duplicate country or redundant prefixes
      const parts = item.display_name
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      // Take up to 3 descriptive parent parts
      const cleanSubtitle = parts.slice(1, 4).join(', ') || 'Territory via OpenStreetMap';

      areas.push({
        id: `osm-${item.osm_type || 'p'}-${item.osm_id || item.place_id}`,
        name: primaryName,
        type: areaType,
        subtitle: cleanSubtitle,
        center: [lat, lon],
        zoom: calculateOsmZoom(areaType),
        keywords: [primaryName.toLowerCase()],
        source: 'osm',
      });
    }

    // Cache clean response
    cache.set(cacheKey, { timestamp: now, data: areas });

    return NextResponse.json({ areas });
  } catch (err: unknown) {
    // Return empty array gracefully on timeout or upstream error
    return NextResponse.json({ areas: [] });
  }
}
