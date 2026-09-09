import { isValidTileCoordinate, parseTileCoordinate } from '@/lib/map-tiles';

const TILE_CACHE_SECONDS = 60 * 60 * 24 * 7;
const UPSTREAM_TILE_ROOT = 'https://tile.openstreetmap.org';

export async function GET(
  _request: Request,
  context: RouteContext<'/map-tiles/[z]/[x]/[y]'>,
) {
  const params = await context.params;
  const z = parseTileCoordinate(params.z);
  const x = parseTileCoordinate(params.x);
  const y = parseTileCoordinate(params.y, true);

  if (z === null || x === null || y === null || !isValidTileCoordinate(z, x, y)) {
    return new Response('Invalid tile coordinate', { status: 400 });
  }

  try {
    const upstream = await fetch(`${UPSTREAM_TILE_ROOT}/${z}/${x}/${y}.png`, {
      headers: {
        'User-Agent': 'JuanDerQuest-Web/1.0 (+https://jdq.zernanvash.dev/about)',
        Referer: 'https://jdq.zernanvash.dev/map',
        Accept: 'image/png,image/*;q=0.8',
      },
      next: { revalidate: TILE_CACHE_SECONDS },
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
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
