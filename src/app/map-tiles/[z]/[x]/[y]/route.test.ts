import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const coordinate = (z: number, lat: number, lng: number) => {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { z: `${z}`, x: `${x}`, y: `${y}.png` };
};

const invoke = (tile: { z: string; x: string; y: string }, headers: HeadersInit = {}, query = '') =>
  GET(new Request(`https://juanderquest.app/map-tiles/${tile.z}/${tile.x}/${tile.y}${query}`, { headers }), {
    params: Promise.resolve(tile),
  });

describe('map tile route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('serves a Philippines tile with cache headers', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const response = await invoke(coordinate(14, 16.2, 119.95), { 'cf-connecting-ip': 'test-ph-tile' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('max-age=604800');
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('refuses foreign and z19 tiles before fetching upstream', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const foreign = await invoke(coordinate(10, 35.68, 139.69), { 'cf-connecting-ip': 'foreign-tile' });
    expect(foreign.status).toBe(404);
    expect(foreign.headers.get('cache-control')).toBe('public, max-age=86400');
    const highZoom = await invoke(coordinate(19, 16.2, 119.95), { 'cf-connecting-ip': 'z19-tile' });
    expect(highZoom.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rate limits after 400 requests from one client', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const upstream = vi.fn().mockImplementation(async () => new Response(new Uint8Array([1]), { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const tile = coordinate(14, 16.2, 119.95);
    const responses = await Promise.all(
      Array.from({ length: 401 }, () => invoke(tile, { 'cf-connecting-ip': 'route-rate-limit-client' })),
    );
    const limited = responses.filter((response) => response.status === 429);
    expect(limited).toHaveLength(1);
    expect(limited[0].headers.get('retry-after')).toBe('5');
    expect(limited[0].headers.get('cache-control')).toBe('no-store');
    expect(upstream).toHaveBeenCalledTimes(400);
  });

  it('rejects unrecognized styles and converts upstream 503 to 502', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    vi.stubGlobal('fetch', upstream);
    const tile = coordinate(14, 16.2, 119.95);
    const badStyle = await invoke(tile, { 'cf-connecting-ip': 'bad-style' }, '?style=other');
    expect(badStyle.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const unavailable = await invoke(tile, { 'cf-connecting-ip': 'upstream-503' });
    expect(unavailable.status).toBe(502);
    expect(warn).toHaveBeenCalledWith('[tiles] upstream', 503, 14);
  });
});
