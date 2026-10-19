import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const coordinate = (z: number, lat: number, lng: number) => {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { z: `${z}`, x: `${x}`, y: `${y}.mvt` };
};

const invoke = (tile: { z: string; x: string; y: string }, headers: HeadersInit = {}) =>
  GET(new Request(`https://juanderquest.app/vt/${tile.z}/${tile.x}/${tile.y}`, { headers }), {
    params: Promise.resolve(tile),
  });

describe('vector tile route /vt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('serves a vector tile with protobuf content-type and cache headers', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'application/x-protobuf' },
      }),
    );
    vi.stubGlobal('fetch', upstream);
    const response = await invoke(coordinate(14, 16.2, 119.95), { 'cf-connecting-ip': 'test-vt-ph' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/x-protobuf');
    expect(response.headers.get('cache-control')).toContain('max-age=604800');
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('refuses foreign and z19 tiles before fetching upstream', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const foreign = await invoke(coordinate(10, 35.68, 139.69), { 'cf-connecting-ip': 'foreign-vt' });
    expect(foreign.status).toBe(404);
    expect(foreign.headers.get('cache-control')).toBe('public, max-age=86400');

    const highZoom = await invoke(coordinate(19, 16.2, 119.95), { 'cf-connecting-ip': 'z19-vt' });
    expect(highZoom.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('converts upstream errors to 502 with 60s cache', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('error', { status: 500 }));
    vi.stubGlobal('fetch', upstream);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tile = coordinate(14, 16.2, 119.95);
    const response = await invoke(tile, { 'cf-connecting-ip': 'upstream-err' });
    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
  });
});
