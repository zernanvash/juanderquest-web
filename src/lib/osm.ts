import { AreaDefinition } from '@/lib/areas';

/**
 * Client-side fetcher for OpenStreetMap Nominatim live territories.
 * Queries the cached Next.js API proxy at /api/osm/search.
 */
export async function fetchOsmAreas(query: string, signal?: AbortSignal): Promise<AreaDefinition[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  try {
    const res = await fetch(`/api/osm/search?q=${encodeURIComponent(q)}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { areas?: AreaDefinition[] };
    return data.areas || [];
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      return [];
    }
    return [];
  }
}
