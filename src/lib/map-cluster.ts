export type MapPointKind = 'spot' | 'quest';

export interface MapClusterPoint {
  id: string;
  kind: MapPointKind;
  lat: number;
  lng: number;
  pinned: boolean;
}

export interface MapCluster {
  type: 'cluster';
  key: string;
  count: number;
  lat: number;
  lng: number;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  ids: string[];
  hasQuest: boolean;
}

export type MapClusterResult = MapCluster | { type: 'point'; id: string };

const WORLD_TILE_SIZE = 256;

/** Shared deterministic grid clusterer. Pinned points always stay independent. */
export function clusterPoints(
  points: MapClusterPoint[],
  zoom: number,
  cellPx = 64,
): MapClusterResult[] {
  if (points.length === 0) return [];
  if (!(cellPx > 0) || !Number.isFinite(cellPx)) throw new RangeError('cellPx must be positive');

  const sortedPoints = [...points].sort((a, b) => compareText(a.id, b.id));
  if (zoom >= 16) return sortedPoints.map(({ id }) => ({ type: 'point', id }));

  const output: MapClusterResult[] = [];
  const groups = new Map<string, MapClusterPoint[]>();

  for (const point of sortedPoints) {
    if (point.pinned) {
      output.push({ type: 'point', id: point.id });
      continue;
    }
    const projected = projectToWorldPixels(point.lat, point.lng, zoom);
    const cellKey = `${Math.floor(projected.x / cellPx)}:${Math.floor(projected.y / cellPx)}`;
    const group = groups.get(cellKey);
    if (group) group.push(point);
    else groups.set(cellKey, [point]);
  }

  for (const [cellKey, group] of groups) {
    if (group.length === 1) {
      output.push({ type: 'point', id: group[0].id });
      continue;
    }
    const ids = group.map(({ id }) => id).sort(compareText);
    const latTotal = group.reduce((total, point) => total + point.lat, 0);
    const lngTotal = group.reduce((total, point) => total + point.lng, 0);
    output.push({
      type: 'cluster',
      key: `z${Math.floor(zoom)}:${cellKey}`,
      count: group.length,
      lat: latTotal / group.length,
      lng: lngTotal / group.length,
      bounds: {
        minLat: Math.min(...group.map(({ lat }) => lat)),
        maxLat: Math.max(...group.map(({ lat }) => lat)),
        minLng: Math.min(...group.map(({ lng }) => lng)),
        maxLng: Math.max(...group.map(({ lng }) => lng)),
      },
      ids,
      hasQuest: group.some(({ kind }) => kind === 'quest'),
    });
  }

  return output.sort((a, b) => compareText(outputKey(a), outputKey(b)));
}

function projectToWorldPixels(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const scale = WORLD_TILE_SIZE * 2 ** zoom;
  return {
    x: ((lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

function outputKey(result: MapClusterResult) {
  return result.type === 'cluster' ? `cluster:${result.key}` : `point:${result.id}`;
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
