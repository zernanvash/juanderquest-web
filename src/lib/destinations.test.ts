import { describe, it, expect } from 'vitest';
import {
  PUBLISHED_DESTINATIONS,
  isSyntheticSpot,
  getPublishedDestination,
  getPublishedSlugs,
} from './destinations';

describe('destinations registry and fixture classification', () => {
  it('contains verified canonical Pangasinan destinations', () => {
    expect(PUBLISHED_DESTINATIONS.length).toBeGreaterThanOrEqual(8);
    for (const spot of PUBLISHED_DESTINATIONS) {
      expect(spot.slug).toBeTruthy();
      expect(spot.name).toBeTruthy();
      expect(spot.municipality).toBeTruthy();
      expect(spot.description).toBeTruthy();
      expect(spot.category).toBeTruthy();
    }
  });

  it('correctly identifies synthetic QA and test fixtures for noindex tagging', () => {
    expect(isSyntheticSpot('test-patar-white-beach')).toBe(true);
    expect(isSyntheticSpot('qa-spot-alentajan')).toBe(true);
    expect(isSyntheticSpot('mock-lingayen-park')).toBe(true);
    expect(isSyntheticSpot('fixture-spot-123')).toBe(true);
    expect(isSyntheticSpot('demo-spot')).toBe(true);
    expect(isSyntheticSpot('synthetic-beach')).toBe(true);
    expect(isSyntheticSpot('bolinao-test')).toBe(true);
    expect(isSyntheticSpot('test')).toBe(true);

    // Genuine published destinations MUST NOT be flagged as synthetic
    expect(isSyntheticSpot('patar-white-beach')).toBe(false);
    expect(isSyntheticSpot('hundred-islands-national-park')).toBe(false);
    expect(isSyntheticSpot('bolinao-falls-1')).toBe(false);
    expect(isSyntheticSpot('minor-basilica-of-manaoag')).toBe(false);
    expect(isSyntheticSpot('lingayen-baywalk')).toBe(false);
    expect(isSyntheticSpot('third-wave-cafe-dagupan')).toBe(false);
  });

  it('retrieves published destination details by slug', () => {
    const patar = getPublishedDestination('patar-white-beach');
    expect(patar).toBeDefined();
    expect(patar?.name).toBe('Patar White Beach');
    expect(patar?.municipality).toBe('Bolinao');

    const unknown = getPublishedDestination('test-non-existent-spot');
    expect(unknown).toBeUndefined();
  });

  it('returns all published slugs for SSG pre-rendering and sitemap generation', () => {
    const slugs = getPublishedSlugs();
    expect(slugs).toContain('hundred-islands-national-park');
    expect(slugs).toContain('patar-white-beach');
    expect(slugs).toContain('bolinao-falls-1');
    expect(slugs).toContain('minor-basilica-of-manaoag');
    expect(slugs).toContain('dagupan-bangus-market');
    expect(slugs).toContain('lingayen-baywalk');
    expect(slugs).toContain('third-wave-cafe-dagupan');
    expect(slugs).toContain('pangasinan-provincial-capitol');
  });
});
