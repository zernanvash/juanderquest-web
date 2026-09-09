export const MAP_TILE_URL = '/map-tiles/{z}/{x}/{y}.png?style=osm-standard-v1';
export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const MAP_TILE_MAX_ZOOM = 19;

export function parseTileCoordinate(value: string, allowPngSuffix = false): number | null {
  const match = (allowPngSuffix ? /^(\d+)\.png$/ : /^(\d+)$/).exec(value);
  if (!match) return null;
  const coordinate = Number(match[1]);
  return Number.isSafeInteger(coordinate) ? coordinate : null;
}

export function isValidTileCoordinate(z: number, x: number, y: number): boolean {
  if (z < 0 || z > MAP_TILE_MAX_ZOOM) return false;
  const limit = 2 ** z;
  return x >= 0 && x < limit && y >= 0 && y < limit;
}
