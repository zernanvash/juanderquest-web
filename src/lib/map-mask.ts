/**
 * Helper to build inverted dimming polygon mask.
 * Outer box covers the world / Philippines, inner hole is the target area's polygon geometry.
 */
export function buildInvertedMask(areaGeometry: any): any {
  if (!areaGeometry) return null;

  // Global bounding ring covering the whole world
  const worldRing: [number, number][] = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];

  if (areaGeometry.type === 'Polygon') {
    // Polygon: first ring is exterior. We append its exterior ring as a hole in the world polygon.
    return {
      type: 'Polygon',
      coordinates: [worldRing, areaGeometry.coordinates[0]],
    };
  }

  if (areaGeometry.type === 'MultiPolygon') {
    // For MultiPolygon, build a Polygon with multiple interior rings (one for each exterior part)
    const rings = [worldRing];
    for (const poly of areaGeometry.coordinates) {
      if (poly && poly[0]) {
        rings.push(poly[0]);
      }
    }
    return {
      type: 'Polygon',
      coordinates: rings,
    };
  }

  return null;
}
