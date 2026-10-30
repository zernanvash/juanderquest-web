export const MAP_TILE_URL = '/map-tiles/{z}/{x}/{y}.png?style=osm-standard-v1';
export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const MAP_TILE_MAX_ZOOM = 18;
export const MAP_MAP_MAX_ZOOM = 19;

/** Every web map uses this layer so requests stop at z18 and upscale beyond it. */
export function createBaseTileLayer(L: typeof import('leaflet')) {
  return L.tileLayer(MAP_TILE_URL, {
    attribution: MAP_TILE_ATTRIBUTION,
    maxNativeZoom: MAP_TILE_MAX_ZOOM,
    maxZoom: MAP_MAP_MAX_ZOOM,
  });
}

/**
 * Esri World Imagery through an ArcGIS Location Platform key (owner 2026-10-30). The key is a public
 * client key restricted by origin; it is set in the environment, never committed. No key → no satellite.
 * Tiles load straight from Esri (their terms do not allow proxying or caching them).
 */
export const SATELLITE_KEY = process.env.NEXT_PUBLIC_ARCGIS_KEY?.trim() ?? '';
export const SATELLITE_ATTRIBUTION =
  'Powered by <a href="https://www.esri.com">Esri</a> | Esri, Maxar, Earthstar Geographics, and the GIS User Community';

export function satelliteAvailable(key = SATELLITE_KEY): boolean {
  return key.length > 0;
}

export function satelliteTileUrl(key = SATELLITE_KEY): string {
  return `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${encodeURIComponent(key)}`;
}

export function createSatelliteTileLayer(L: typeof import('leaflet'), key = SATELLITE_KEY) {
  return L.tileLayer(satelliteTileUrl(key), {
    attribution: SATELLITE_ATTRIBUTION,
    maxNativeZoom: MAP_TILE_MAX_ZOOM,
    maxZoom: MAP_MAP_MAX_ZOOM,
  });
}

export function parseTileCoordinate(value: string, allowPngSuffix = false): number | null {
  const match = (allowPngSuffix ? /^(\d+)\.png$/ : /^(\d+)$/).exec(value);
  if (!match) return null;
  const coordinate = Number(match[1]);
  return Number.isSafeInteger(coordinate) ? coordinate : null;
}

export function isValidTileCoordinate(z: number, x: number, y: number): boolean {
  if (z < 0 || z > 30) return false;
  const limit = 2 ** z;
  return x >= 0 && x < limit && y >= 0 && y < limit;
}
