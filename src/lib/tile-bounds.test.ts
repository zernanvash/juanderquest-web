import { describe, expect, it } from 'vitest';
import { isServiceTile, tileToBounds } from './tile-bounds';

function tileAt(z: number, lat: number, lng: number) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { z, x, y };
}

describe('Philippines tile bounds', () => {
  it('accepts Hundred Islands and rejects Tokyo and unsupported zooms', () => {
    const hundredIslands = tileAt(14, 16.2, 119.95);
    const tokyo = tileAt(10, 35.68, 139.69);
    expect(isServiceTile(hundredIslands.z, hundredIslands.x, hundredIslands.y)).toBe(true);
    expect(isServiceTile(tokyo.z, tokyo.x, tokyo.y)).toBe(false);
    expect(isServiceTile(4, 14, 7)).toBe(false);
    expect(isServiceTile(19, 262450, 218000)).toBe(false);
  });

  it('includes tiles that straddle the service box boundary', () => {
    const n = 2 ** 10;
    const x = Math.floor(((116 + 180) / 360) * n);
    const y = Math.floor(((1 - Math.asinh(Math.tan((4.5 * Math.PI) / 180)) / Math.PI) / 2) * n);
    expect(isServiceTile(10, x, y)).toBe(true);
  });

  it('projects the z0 tile to the entire world', () => {
    const bounds = tileToBounds(0, 0, 0);
    expect(bounds.latN).toBeCloseTo(85.0511287798066, 10);
    expect(bounds.latS).toBeCloseTo(-85.0511287798066, 10);
    expect(bounds.lngW).toBe(-180);
    expect(bounds.lngE).toBe(180);
  });
});
