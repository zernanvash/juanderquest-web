import { isValidTileCoordinate, parseTileCoordinate } from '@/lib/map-tiles';
import { isServiceTile } from '@/lib/tile-bounds';
import { takeToken, tileClientKey } from '@/lib/tile-rate-limit';

const TILE_CACHE_SECONDS = 60 * 60 * 24 * 7;
const MARTIN_URL = process.env.MARTIN_URL || 'http://127.0.0.1:3011';
let lastUpstreamWarningAt = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const params = await context.params;
  const z = parseTileCoordinate(params.z);
  const x = parseTileCoordinate(params.x);

  // Accept coordinates with optional .mvt or .pbf extension
  const rawY = params.y.replace(/\.(mvt|pbf)$/, '');
  const y = parseTileCoordinate(rawY);

  if (z === null || x === null || y === null || !isValidTileCoordinate(z, x, y)) {
    return new Response('Invalid tile coordinate', { status: 400 });
  }

  // Allow zoom 0-4 for low-zoom basemap overviews, and check bounds for z >= 5
  if (z >= 5 && !isServiceTile(z, x, y)) {
    return new Response('Outside service area', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  if (!takeToken(tileClientKey(request.headers))) {
    return new Response('Tile rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const upstreamUrl = `${MARTIN_URL}/philippines/${z}/${x}/${y}`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/x-protobuf,application/vnd.mapbox-vector-tile,*/*',
      },
      next: { revalidate: TILE_CACHE_SECONDS },
      signal: AbortSignal.timeout(8_000),
    });

    if (upstream.status === 404) {
      return new Response('Tile not found', {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }

    if (!upstream.ok) {
      if ((upstream.status === 429 || upstream.status >= 500) && Date.now() - lastUpstreamWarningAt >= 60_000) {
        lastUpstreamWarningAt = Date.now();
        console.warn('[vt] upstream error', upstream.status, z, x, y);
      }
      return unavailableTileResponse(502);
    }

    const tileBytes = await upstream.arrayBuffer();

    return new Response(tileBytes, {
      headers: {
        'Content-Type': 'application/x-protobuf',
        'Cache-Control': `public, max-age=${TILE_CACHE_SECONDS}, stale-while-revalidate=86400`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return unavailableTileResponse(504);
  }
}

function unavailableTileResponse(status: 502 | 504) {
  return new Response('Vector tile unavailable', {
    status,
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
