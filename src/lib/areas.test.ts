import { describe, it, expect } from 'vitest';
import { KNOWN_AREAS, findMatchingAreas, findAreaByIdOrName } from './areas';

describe('Geographic Areas Catalog (areas.ts)', () => {
  it('contains essential Pangasinan regions and municipalities', () => {
    const ids = KNOWN_AREAS.map((a) => a.id);
    expect(ids).toContain('pangasinan');
    expect(ids).toContain('philippines');
    expect(ids).toContain('bolinao');
    expect(ids).toContain('alaminos');
    expect(ids).toContain('dagupan');
    expect(ids).toContain('lingayen');
  });

  it('provides valid coordinate centers and zoom levels for all areas', () => {
    KNOWN_AREAS.forEach((area) => {
      expect(area.center).toHaveLength(2);
      expect(area.center[0]).toBeGreaterThan(0); // Lat
      expect(area.center[1]).toBeGreaterThan(100); // Lng
      expect(area.zoom).toBeGreaterThanOrEqual(5);
      expect(area.zoom).toBeLessThanOrEqual(18);
    });
  });

  describe('findMatchingAreas', () => {
    it('returns empty array for empty or single-character queries', () => {
      expect(findMatchingAreas('')).toEqual([]);
      expect(findMatchingAreas(' ')).toEqual([]);
      expect(findMatchingAreas('p')).toEqual([]);
    });

    it('matches "pangasinan" correctly', () => {
      const results = findMatchingAreas('pangasinan');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('pangasinan');
      expect(results[0].type).toBe('province');
    });

    it('matches "bolinao" case-insensitively', () => {
      const results = findMatchingAreas('BOLINAO');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('bolinao');
    });

    it('matches "alaminos" and returns city definition', () => {
      const results = findMatchingAreas('alaminos');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('alaminos');
    });
  });

  describe('findAreaByIdOrName', () => {
    it('returns undefined for empty query', () => {
      expect(findAreaByIdOrName('')).toBeUndefined();
    });

    it('finds area by exact ID or name', () => {
      expect(findAreaByIdOrName('pangasinan')?.name).toBe('Pangasinan');
      expect(findAreaByIdOrName('Philippines')?.id).toBe('philippines');
      expect(findAreaByIdOrName('Bolinao')?.id).toBe('bolinao');
    });

    it('finds area by keyword or partial match', () => {
      expect(findAreaByIdOrName('pilipinas')?.id).toBe('philippines');
      expect(findAreaByIdOrName('pang')?.id).toBe('pangasinan');
    });
  });
});
