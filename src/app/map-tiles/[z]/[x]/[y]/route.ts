import { isValidTileCoordinate, parseTileCoordinate } from '@/lib/map-tiles';
import { isServiceTile } from '@/lib/tile-bounds';
import { takeToken, tileClientKey } from '@/lib/tile-rate-limit';

const TILE_CACHE_SECONDS = 60 * 60 * 24 * 7;
const UPSTREAM_TILE_ROOT = 'https://tile.openstreetmap.org';
const ALLOWED_STYLES = new Set(['osm-standard-v1']);
let lastUpstreamWarningAt = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const params = await context.params;
  const z = parseTileCoordinate(params.z);
  const x = parseTileCoordinate(params.x);
  const y = parseTileCoordinate(params.y, true);

  if (z === null || x === null || y === null || !isValidTileCoordinate(z, x, y)) {
    return new Response('Invalid tile coordinate', { status: 400 });
  }

  if (!isServiceTile(z, x, y)) {
    return new Response('Outside service area', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  const query = new URL(request.url).searchParams;
  const styles = query.getAll('style');
  const style = styles[0] ?? 'osm-standard-v1';
  if (
    [...query.keys()].some((key) => key !== 'style') ||
    styles.length > 1 ||
    !ALLOWED_STYLES.has(style)
  ) {
    return new Response('Unsupported tile style', { status: 400 });
  }

  if (!takeToken(tileClientKey(request.headers))) {
    return new Response('Tile rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const upstream = await fetch(`${UPSTREAM_TILE_ROOT}/${z}/${x}/${y}.png`, {
      headers: {
        'User-Agent': 'JuanDerQuest-Web/1.0 (+https://juanderquest.app/about)',
        Referer: 'https://juanderquest.app/map',
        Accept: 'image/png,image/*;q=0.8',
      },
      next: { revalidate: TILE_CACHE_SECONDS },
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      if ((upstream.status === 429 || upstream.status >= 500) && Date.now() - lastUpstreamWarningAt >= 60_000) {
        lastUpstreamWarningAt = Date.now();
        console.warn('[tiles] upstream', upstream.status, z);
      }
      return unavailableTileResponse(502);
    }

    return new Response(await upstream.arrayBuffer(), {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/png',
        'Cache-Control': `public, max-age=${TILE_CACHE_SECONDS}, stale-while-revalidate=86400`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return unavailableTileResponse(504);
  }
}

function unavailableTileResponse(status: 502 | 504) {
  return new Response('Basemap tile unavailable', {
    status,
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
