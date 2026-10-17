import { describe, expect, it } from 'vitest';
import {
  SPOT_BEST_TIME,
  SPOT_GOOD_FOR,
  SPOT_POSTING_STEPS,
  buildSpotPayload,
  createSpotPostingDraft,
  firstInvalidPostingStep,
  subcategoriesForCategory,
  validatePostingMediaFile,
  validatePostingPin,
  validatePostingStep,
} from './spot-posting';
import type { SpotPostingDraft } from './spot-posting';

const validDraft = (overrides: Partial<SpotPostingDraft> = {}): SpotPostingDraft => ({
  name: 'Tambobong White Beach',
  category: 'nature_outdoors',
  subcategory: 'white_sand_beach',
  description: 'A quiet stretch of white sand with calm water for swimming and picnics.',
  municipality: 'Dasol',
  address: 'Brgy. Tambobong, Dasol',
  pin: { lat: 15.9083, lng: 119.7892 },
  dailyHours: '06:00 AM - 06:00 PM',
  goodFor: ['families', 'solo'],
  bestTime: ['sunset', 'dry_season'],
  tags: [],
  amenities: ['parking'],
  ...overrides,
});

describe('spot posting pin validation', () => {
  it('accepts a pin inside the Philippines', () => {
    expect(validatePostingPin({ lat: 14.5995, lng: 120.9842 })).toBeNull();
    expect(validatePostingPin({ lat: 6.9, lng: 126.2 })).toBeNull();
  });

  it('rejects missing, non-finite and out-of-country pins', () => {
    expect(validatePostingPin(null)).toMatch(/place the destination pin/i);
    expect(validatePostingPin({ lat: Number.NaN, lng: 120 })).toMatch(/valid numbers/i);
    expect(validatePostingPin({ lat: 3.9, lng: 120 })).toMatch(/inside the Philippines/i);
    expect(validatePostingPin({ lat: 21.6, lng: 120 })).toMatch(/inside the Philippines/i);
    expect(validatePostingPin({ lat: 14.5, lng: 115.9 })).toMatch(/inside the Philippines/i);
    expect(validatePostingPin({ lat: 14.5, lng: 127.1 })).toMatch(/inside the Philippines/i);
  });
});

describe('spot posting step validation', () => {
  it('requires the basics before leaving the first step', () => {
    const errors = validatePostingStep('basics', createSpotPostingDraft());
    expect(errors.name).toBeTruthy();
    expect(errors.subcategory).toBeFalsy();
  });

  it('requires a meaningful description', () => {
    const errors = validatePostingStep('story', validDraft({ description: 'Too short' }));
    expect(errors.description).toMatch(/at least 20/i);
    expect(validatePostingStep('story', validDraft()).description).toBeUndefined();
  });

  it('requires locality plus a pin on the place step', () => {
    const errors = validatePostingStep('place', validDraft({ municipality: '', pin: null }));
    expect(errors.municipality).toBeTruthy();
    expect(errors.pin).toMatch(/place the destination pin/i);
  });

  it('validates good_for and best_time limits on details step', () => {
    const errors = validatePostingStep(
      'details',
      validDraft({
        goodFor: ['invalid_id' as any],
        bestTime: ['early_morning', 'daytime', 'sunset', 'night', 'weekdays'],
      })
    );
    expect(errors.goodFor).toMatch(/invalid visitor fit/i);
    expect(errors.bestTime).toMatch(/at most 4/i);
  });

  it('reports the first invalid step in wizard order', () => {
    expect(firstInvalidPostingStep(createSpotPostingDraft())).toBe('basics');
    expect(firstInvalidPostingStep(validDraft({ description: '' }))).toBe('story');
    expect(firstInvalidPostingStep(validDraft({ address: '' }))).toBe('place');
    expect(
      firstInvalidPostingStep(
        validDraft({
          bestTime: ['early_morning', 'daytime', 'sunset', 'night', 'weekdays'],
        })
      )
    ).toBe('details');
    expect(firstInvalidPostingStep(validDraft())).toBeNull();
  });

  it('reaches the review step without media', () => {
    expect(SPOT_POSTING_STEPS.map((s) => s.id)).toEqual([
      'basics',
      'story',
      'place',
      'details',
      'media',
      'review',
    ]);
    expect(validatePostingStep('review', validDraft())).toEqual({});
  });
});

describe('spot posting payload builder', () => {
  it('maps the draft onto the API contract with server-compatible defaults without price_level', () => {
    const payload = buildSpotPayload(validDraft({ tags: ['hidden_gem'] }), {
      assetId: 'asset-1',
      imageUrl: 'https://cdn.example/photo.jpg',
    });
    expect(payload).toMatchObject({
      name: 'Tambobong White Beach',
      category: 'nature_outdoors',
      subcategory: 'white_sand_beach',
      tags: ['hidden_gem'],
      municipality: 'Dasol',
      address: 'Brgy. Tambobong, Dasol',
      gps_lat: 15.9083,
      gps_lng: 119.7892,
      good_for: ['families', 'solo'],
      best_time: ['sunset', 'dry_season'],
      hours: { daily: '06:00 AM - 06:00 PM' },
      amenities: ['parking'],
      image_url: 'https://cdn.example/photo.jpg',
      asset_id: 'asset-1',
      asset_ids: ['asset-1'],
    });
    expect((payload as any).price_level).toBeUndefined();
  });

  it('omits media keys and empty hours when nothing was provided', () => {
    const payload = buildSpotPayload(validDraft({ dailyHours: '' }));
    expect(payload.hours).toEqual({});
    expect(payload.image_url).toBe('');
    expect(payload.asset_id).toBeUndefined();
    expect(payload.asset_ids).toBeUndefined();
  });
});

describe('spot posting helpers', () => {
  it('lists subcategories for a category', () => {
    expect(subcategoriesForCategory('eat_drink')).toContain('seafood_shack');
    expect(subcategoriesForCategory('unknown')).toEqual([]);
  });

  it('provides good for and best time option lists', () => {
    expect(SPOT_GOOD_FOR.length).toBeGreaterThanOrEqual(5);
    expect(SPOT_BEST_TIME.length).toBeGreaterThanOrEqual(7);
  });

  it('enforces media size limits per media type', () => {
    const image = new File([new Uint8Array(1024)], 'photo.jpg', { type: 'image/jpeg' });
    expect(validatePostingMediaFile(image)).toBeNull();

    const bigImage = new File([new Uint8Array(9 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });
    expect(validatePostingMediaFile(bigImage)).toMatch(/8 MB/);

    const video = new File([new Uint8Array(1024)], 'clip.mp4', { type: 'video/mp4' });
    expect(validatePostingMediaFile(video)).toBeNull();

    const bigVideo = new File([new Uint8Array(31 * 1024 * 1024)], 'clip.mp4', { type: 'video/mp4' });
    expect(validatePostingMediaFile(bigVideo)).toMatch(/30 MB/);
  });
});
