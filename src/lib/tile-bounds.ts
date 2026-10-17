/** Philippines service area, matching the backend contribution bounds. */
export const PH_BOUNDS = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 } as const;
export const TILE_MIN_ZOOM = 5;
export const TILE_MAX_ZOOM = 18;

export function tileToBounds(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lngW = (x / n) * 360 - 180;
  const lngE = ((x + 1) / n) * 360 - 180;
  const latN = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const latS = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return { latN, latS, lngW, lngE };
}

/** True when a valid tile overlaps the Philippines service box and zoom range. */
export function isServiceTile(z: number, x: number, y: number): boolean {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (z < TILE_MIN_ZOOM || z > TILE_MAX_ZOOM) return false;
  const limit = 2 ** z;
  if (x < 0 || x >= limit || y < 0 || y >= limit) return false;
  const bounds = tileToBounds(z, x, y);
  return (
    bounds.latS <= PH_BOUNDS.maxLat &&
    bounds.latN >= PH_BOUNDS.minLat &&
    bounds.lngW <= PH_BOUNDS.maxLng &&
    bounds.lngE >= PH_BOUNDS.minLng
  );
}
