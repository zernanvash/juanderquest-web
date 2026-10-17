import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/map-clustering-fixtures.json';
import { clusterPoints, MapClusterPoint, MapClusterResult } from './map-cluster';

describe('shared map clustering fixtures', () => {
  it.each(fixtures)('$name', ({ points, zoom, expected }) => {
    const normalize = (value: unknown): unknown => {
      if (typeof value === 'number') return Number(value.toFixed(9));
      if (Array.isArray(value)) return value.map(normalize);
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalize(nested)]));
      }
      return value;
    };
    expect(normalize(clusterPoints(points as MapClusterPoint[], zoom))).toEqual(normalize(expected as MapClusterResult[]));
  });

  it('preserves the filtered destination count across outputs', () => {
    const points = Array.from({ length: 30 }, (_, i) => ({
      id: `spot-${String(i).padStart(2, '0')}`,
      kind: 'spot' as const,
      lat: 16 + i * 0.00001,
      lng: 120 + i * 0.00001,
      pinned: false,
    }));
    const groups = clusterPoints(points, 8);
    expect(groups.filter((group) => group.type === 'cluster').length).toBeGreaterThan(0);
    expect(groups.reduce((sum, group) => sum + (group.type === 'cluster' ? group.count : 1), 0)).toBe(30);
  });
});
