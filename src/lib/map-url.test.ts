import { describe, expect, it } from 'vitest';
import { clampMapZoom, isValidLatitude, isValidLongitude } from './map-url';

describe('map deep-link parameter hardening', () => {
  it('accepts only finite coordinates inside the globe bounds', () => {
    expect(isValidLatitude(16.03)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(90.01)).toBe(false);
    expect(isValidLatitude(Number.NaN)).toBe(false);
    expect(isValidLatitude(Number.POSITIVE_INFINITY)).toBe(false);

    expect(isValidLongitude(120.33)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180.01)).toBe(false);
    expect(isValidLongitude(Number.NaN)).toBe(false);
  });

  it('clamps zoom into the supported tile range and falls back for invalid input', () => {
    expect(clampMapZoom(13)).toBe(13);
    expect(clampMapZoom(2)).toBe(6);
    expect(clampMapZoom(42)).toBe(18);
    expect(clampMapZoom(12.6)).toBe(13);
    expect(clampMapZoom(Number.NaN, 10)).toBe(10);
    expect(clampMapZoom(Number.POSITIVE_INFINITY, 10)).toBe(10);
  });
});
