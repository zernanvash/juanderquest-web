import { describe, it, expect } from 'vitest';
import {
  getDeclutterThreshold,
  calculateItemPriority,
  declutterItems,
} from './map-declutter';
import type { SpotModel, QuestModel } from './api';

const mockSpot1: SpotModel = {
  id: 'spot-1',
  slug: 'hundred-islands-national-park',
  name: 'Hundred Islands National Park',
  description: 'Iconic islands',
  category: 'nature_outdoors',
  subcategory: 'park',
  tags: ['island', 'beach'],
  municipality: 'Alaminos City',
  address: 'Lucap, Alaminos',
  gpsLat: 16.2045,
  gpsLng: 120.0421,
  priceLevel: 1,
  hours: {},
  amenities: [],
  imageUrl: 'https://images.unsplash.com/test.jpg',
  sourceType: 'official',
  sourceName: 'LGU',
  trustLevel: 'verified',
  trendScore: 95,
  recommendationScore: 0.98,
  recommendationReasons: [],
  saved: false,
  crowdStatus: 'quiet',
  crowdConfidence: 'high',
};

const mockSpot2: SpotModel = {
  id: 'spot-2',
  slug: 'nearby-beach-shack',
  name: 'Nearby Beach Shack',
  description: 'Small food stall',
  category: 'eat_drink',
  subcategory: 'cafe',
  tags: ['snack'],
  municipality: 'Alaminos City',
  address: 'Lucap Pier',
  gpsLat: 16.2050, // Very close to spot-1 (colliding in screen space)
  gpsLng: 120.0425,
  priceLevel: 1,
  hours: {},
  amenities: [],
  imageUrl: '',
  sourceType: 'user',
  sourceName: 'Traveler',
  trustLevel: 'unverified',
  trendScore: 20,
  recommendationScore: 0.2,
  recommendationReasons: [],
  saved: false,
  crowdStatus: 'quiet',
  crowdConfidence: 'low',
};

const mockSpot3: SpotModel = {
  id: 'spot-3',
  slug: 'patar-white-beach',
  name: 'Patar White Beach',
  description: 'Golden sunset beach',
  category: 'nature_outdoors',
  subcategory: 'beach',
  tags: ['beach'],
  municipality: 'Bolinao',
  address: 'Patar, Bolinao',
  gpsLat: 16.3021, // Far away in Bolinao
  gpsLng: 119.7821,
  priceLevel: 1,
  hours: {},
  amenities: [],
  imageUrl: 'https://images.unsplash.com/beach.jpg',
  sourceType: 'official',
  sourceName: 'LGU',
  trustLevel: 'verified',
  trendScore: 90,
  recommendationScore: 0.95,
  recommendationReasons: [],
  saved: false,
  crowdStatus: 'moderate',
  crowdConfidence: 'high',
};

const mockQuest: QuestModel = {
  id: 'quest-1',
  title: 'Island Explorer Challenge',
  description: 'Visit 3 islands',
  category: 'eco',
  locationName: 'Lucap Wharf',
  gpsLat: 16.2040,
  gpsLng: 120.0415,
  radiusMeters: 100,
  rewardPoints: 250,
};

describe('Map Declutter Engine', () => {
  it('returns progressive thresholds based on zoom level', () => {
    const macroThreshold = getDeclutterThreshold(9);
    const regionalThreshold = getDeclutterThreshold(11);
    const streetThreshold = getDeclutterThreshold(15);

    expect(macroThreshold.minDistanceX).toBeGreaterThan(regionalThreshold.minDistanceX);
    expect(regionalThreshold.minDistanceX).toBeGreaterThan(streetThreshold.minDistanceX);
    expect(macroThreshold.showLabelsByDefault).toBe(false);
    expect(streetThreshold.showLabelsByDefault).toBe(true);
  });

  it('calculates priority correctly, favoring selected items and iconic landmarks', () => {
    const regularPriority = calculateItemPriority(mockSpot2, 'spot', false, false);
    const landmarkPriority = calculateItemPriority(mockSpot1, 'spot', false, false);
    const savedPriority = calculateItemPriority(mockSpot2, 'spot', false, true);
    const selectedPriority = calculateItemPriority(mockSpot2, 'spot', true, false);

    expect(landmarkPriority).toBeGreaterThan(regularPriority);
    expect(savedPriority).toBeGreaterThan(landmarkPriority);
    expect(selectedPriority).toBeGreaterThan(savedPriority);
  });

  it('eliminates overlapping candidate items in close screen space', () => {
    // Screen mapping where spot-1 and spot-2 are only 20px apart, while spot-3 is 400px away
    const toScreenPoint = (lat: number, lng: number) => {
      if (lat === mockSpot1.gpsLat) return { x: 200, y: 200 };
      if (lat === mockSpot2.gpsLat) return { x: 215, y: 210 }; // Only 18px away from spot-1!
      if (lat === mockSpot3.gpsLat) return { x: 600, y: 300 }; // 400px away
      return { x: 0, y: 0 };
    };

    const isInViewport = () => true;

    const items = [
      { type: 'spot' as const, data: mockSpot1 },
      { type: 'spot' as const, data: mockSpot2 },
      { type: 'spot' as const, data: mockSpot3 },
    ];

    // At zoom 10 (regional), threshold is 140px x 100px: spot-2 should be suppressed by spot-1
    const placed = declutterItems(items, 10, toScreenPoint, isInViewport);

    expect(placed.some((p) => p.data.id === 'spot-1')).toBe(true);
    expect(placed.some((p) => p.data.id === 'spot-3')).toBe(true);
    expect(placed.some((p) => p.data.id === 'spot-2')).toBe(false); // Collided and filtered!
  });

  it('always places selected items regardless of collision', () => {
    const toScreenPoint = (lat: number) => {
      if (lat === mockSpot1.gpsLat) return { x: 200, y: 200 };
      if (lat === mockSpot2.gpsLat) return { x: 205, y: 205 }; // Collision!
      return { x: 0, y: 0 };
    };

    const isInViewport = () => true;

    const items = [
      { type: 'spot' as const, data: mockSpot1 },
      { type: 'spot' as const, data: mockSpot2 },
    ];

    // Even if spot-2 collides, if it is selected, it must be placed!
    const placed = declutterItems(items, 10, toScreenPoint, isInViewport, 'spot-2');

    expect(placed.some((p) => p.data.id === 'spot-2')).toBe(true);
    const selectedPlaced = placed.find((p) => p.data.id === 'spot-2');
    expect(selectedPlaced?.showLabel).toBe(true);
  });

  it('filters out items outside the visible viewport bounds', () => {
    const toScreenPoint = () => ({ x: 100, y: 100 });
    const isInViewport = (lat: number) => lat > 16.25; // only spot-3 is in viewport

    const items = [
      { type: 'spot' as const, data: mockSpot1 },
      { type: 'spot' as const, data: mockSpot3 },
    ];

    const placed = declutterItems(items, 12, toScreenPoint, isInViewport);

    expect(placed.length).toBe(1);
    expect(placed[0].data.id === 'spot-3').toBe(true);
  });
});
