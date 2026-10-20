import { describe, it, expect } from 'vitest';
import { isPointInsideGeometry, pointInPolygon } from './map-geometry';

describe('map-geometry point-in-polygon', () => {
  const squarePoly = {
    type: 'Polygon',
    coordinates: [
      [
        [120.0, 16.0],
        [120.5, 16.0],
        [120.5, 16.5],
        [120.0, 16.5],
        [120.0, 16.0],
      ],
    ],
  };

  it('detects point inside polygon', () => {
    expect(isPointInsideGeometry(120.2, 16.2, squarePoly)).toBe(true);
  });

  it('detects point outside polygon', () => {
    expect(isPointInsideGeometry(119.8, 16.2, squarePoly)).toBe(false);
    expect(isPointInsideGeometry(120.2, 16.7, squarePoly)).toBe(false);
  });
});
