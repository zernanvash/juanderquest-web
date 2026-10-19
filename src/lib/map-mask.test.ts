import { describe, it, expect } from 'vitest';
import { buildInvertedMask } from './map-mask';

describe('buildInvertedMask', () => {
  it('returns null when areaGeometry is missing', () => {
    expect(buildInvertedMask(null)).toBeNull();
  });

  it('builds an inverted polygon with world outer ring and area inner ring for Polygon', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [120.3, 16.0],
          [120.4, 16.0],
          [120.4, 16.1],
          [120.3, 16.1],
          [120.3, 16.0],
        ],
      ],
    };

    const mask = buildInvertedMask(polygon);
    expect(mask).toBeDefined();
    expect(mask.type).toBe('Polygon');
    expect(mask.coordinates).toHaveLength(2);
    expect(mask.coordinates[0]).toEqual([
      [-180, -90],
      [180, -90],
      [180, 90],
      [-180, 90],
      [-180, -90],
    ]);
    expect(mask.coordinates[1]).toEqual(polygon.coordinates[0]);
  });

  it('handles MultiPolygon by creating multiple interior hole rings', () => {
    const multiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [[[120.1, 16.0], [120.2, 16.0], [120.2, 16.1], [120.1, 16.1], [120.1, 16.0]]],
        [[[120.5, 16.0], [120.6, 16.0], [120.6, 16.1], [120.5, 16.1], [120.5, 16.0]]],
      ],
    };

    const mask = buildInvertedMask(multiPolygon);
    expect(mask.type).toBe('Polygon');
    expect(mask.coordinates).toHaveLength(3); // 1 world + 2 holes
  });
});
