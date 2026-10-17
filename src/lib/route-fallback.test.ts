import { describe, expect, it } from 'vitest';
import { externalRouteUrls, isStraightLineFallback, RouteModel } from './api';

describe('route fallback helpers', () => {
  const base = { summary: {} as RouteModel['summary'], coordinates: [], maneuvers: [] };

  it('identifies degraded and coverage-limited estimates', () => {
    expect(isStraightLineFallback({ ...base, degraded: true })).toBe(true);
    expect(isStraightLineFallback({ ...base, navigationMode: 'straight_line_estimate' })).toBe(true);
    expect(isStraightLineFallback({ ...base, warning: { code: 'OUTSIDE_ROUTING_COVERAGE', message: 'outside' } })).toBe(true);
    expect(isStraightLineFallback({ ...base, navigationMode: 'turn_by_turn' })).toBe(false);
  });

  it('builds external navigation links with destination coordinates', () => {
    const links = externalRouteUrls(16.2, 120.04);
    expect(links.googleMaps).toContain('destination=16.2,120.04');
    expect(links.googleMaps).toContain('travelmode=driving');
    expect(links.waze).toContain('ll=16.2,120.04');
    expect(links.waze).toContain('navigate=yes');
  });
});
