/**
 * Geometry helpers for vector map client: point-in-polygon ray-casting.
 */

export type Ring = [number, number][]; // [lng, lat]

export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(lng: number, lat: number, coordinates: Ring[]): boolean {
  if (!coordinates || coordinates.length === 0) return false;
  if (!pointInRing(lng, lat, coordinates[0])) return false;
  for (let i = 1; i < coordinates.length; i++) {
    if (pointInRing(lng, lat, coordinates[i])) {
      return false;
    }
  }
  return true;
}

export function pointInMultiPolygon(lng: number, lat: number, coordinates: Ring[][]): boolean {
  if (!coordinates) return false;
  for (const polygon of coordinates) {
    if (pointInPolygon(lng, lat, polygon)) {
      return true;
    }
  }
  return false;
}

export function isPointInsideGeometry(lng: number, lat: number, geometry: any): boolean {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') {
    return pointInPolygon(lng, lat, geometry.coordinates);
  }
  if (geometry.type === 'MultiPolygon') {
    return pointInMultiPolygon(lng, lat, geometry.coordinates);
  }
  return false;
}
