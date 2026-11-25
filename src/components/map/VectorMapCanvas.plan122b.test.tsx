import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { normalizeSpot, SpotModel } from '@/lib/api';
import {
  MapMarkerLegend,
  mergeAreaSpotMarkerMetadata,
  PIN_IMAGE_IDS,
  registerHierarchicalPinImages,
  resolveSpotMarkerKind,
  SPOT_PIN_ICON_EXPRESSION,
} from './VectorMapCanvas';

const baseSpot = (overrides: Partial<SpotModel> = {}): SpotModel => ({
  id: 'spot-1',
  slug: 'spot-1',
  name: 'Test Spot',
  description: 'A spot in Pangasinan.',
  category: 'nature',
  subcategory: 'beach',
  tags: [],
  municipality: 'Bolinao',
  address: 'Bolinao',
  gpsLat: 16.3,
  gpsLng: 119.8,
  priceLevel: null,
  goodFor: [],
  bestTime: [],
  hours: {},
  amenities: [],
  imageUrl: '',
  photos: [],
  assetIds: [],
  sourceType: 'user_discovered',
  sourceName: 'Traveler',
  trustLevel: 'community',
  recommendationReasons: [],
  saved: false,
  liked: false,
  trendScore: 0,
  crowdStatus: 'quiet',
  crowdConfidence: 'low',
  ...overrides,
});

describe('Plan 122b web map marker hierarchy & Local Partner metadata', () => {
  it('normalizes additive marker fields and stays clean when marketplace is off', () => {
    const partnerSpot = normalizeSpot({
      id: 'spot-partner',
      slug: 'kape-dagupan',
      name: 'Kape Dagupan',
      description: 'Roastery',
      category: 'cafe',
      subcategory: 'coffee',
      municipality: 'Dagupan City',
      address: 'AB Fernandez',
      gps_lat: 16.04,
      gps_lng: 120.33,
      source_type: 'lgu_verified',
      source_name: 'LGU',
      trust_level: 'lgu_verified',
      marker_kind: 'merchant',
      local_partner: {
        merchant_id: 'merch-1',
        name: 'Kape Dagupan Roastery',
        category: 'food_and_beverage',
        logo_url: null,
        is_published: true,
      },
      active_quest_count: 0,
      active_quest_ids: [],
    });

    expect(partnerSpot.markerKind).toBe('merchant');
    expect(partnerSpot.isLocalPartner).toBe(true);
    expect(partnerSpot.merchantName).toBe('Kape Dagupan Roastery');
    expect(partnerSpot.localPartner?.merchantId).toBe('merch-1');

    // When MARKETPLACE_ENABLED=false, backend returns only spot/quest and local_partner: null
    const nonMarketplaceSpot = normalizeSpot({
      id: 'spot-off',
      slug: 'cafe-hidden',
      name: 'Beachside Cafe',
      description: 'Coffee shop',
      category: 'cafe',
      subcategory: 'coffee',
      municipality: 'Lingayen',
      address: 'Lingayen',
      gps_lat: 16.02,
      gps_lng: 120.23,
      source_type: 'user_discovered',
      source_name: 'Traveler',
      trust_level: 'community',
      marker_kind: 'spot',
      local_partner: null,
      active_quest_count: 2,
      active_quest_ids: ['q1', 'q2'],
    });

    expect(nonMarketplaceSpot.markerKind).toBe('spot');
    expect(nonMarketplaceSpot.isLocalPartner).toBe(false);
    expect(nonMarketplaceSpot.localPartner).toBeNull();
    expect(nonMarketplaceSpot.activeQuestCount).toBe(2);
    expect(nonMarketplaceSpot.activeQuestIds).toEqual(['q1', 'q2']);
  });

  it('registers jdq-pin-spot, jdq-pin-merchant, and jdq-pin-quest and binds MapLibre match expression', () => {
    const addedImages: string[] = [];
    const mockCtx = {
      beginPath: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 20, height: 28 })),
    };
    const origCreateElement = document.createElement.bind(document);
    const origPath2D = globalThis.Path2D;
    globalThis.Path2D = vi.fn().mockImplementation(function Path2DMock() {
      return {};
    }) as unknown as typeof Path2D;
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 20,
          height: 28,
          getContext: () => mockCtx,
        } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tag);
    });

    const mockMap = {
      hasImage: (name: string) => addedImages.includes(name),
      addImage: (name: string) => {
        addedImages.push(name);
      },
    };

    registerHierarchicalPinImages(mockMap);
    createSpy.mockRestore();
    globalThis.Path2D = origPath2D;

    expect(addedImages).toEqual(
      expect.arrayContaining([
        PIN_IMAGE_IDS.spot,
        PIN_IMAGE_IDS.merchant,
        PIN_IMAGE_IDS.quest,
        PIN_IMAGE_IDS.selected,
      ]),
    );
    expect(SPOT_PIN_ICON_EXPRESSION).toEqual([
      'match',
      ['get', 'marker_kind'],
      'quest',
      'jdq-pin-quest',
      'merchant',
      'jdq-pin-merchant',
      'jdq-pin-spot',
    ]);
  });

  it('resolves marker hierarchy and merges catalog metadata onto area spots', () => {
    expect(resolveSpotMarkerKind(baseSpot({ activeQuestCount: 1, isLocalPartner: true }))).toBe('quest');
    expect(resolveSpotMarkerKind(baseSpot({ isLocalPartner: true }))).toBe('merchant');
    expect(resolveSpotMarkerKind(baseSpot())).toBe('spot');

    const areaRaw = [baseSpot({ id: 'spot-1' })];
    const catalog = [
      baseSpot({
        id: 'spot-1',
        markerKind: 'merchant',
        isLocalPartner: true,
        merchantId: 'merch-1',
        merchantName: 'Kape Dagupan',
        activeQuestCount: 0,
      }),
    ];
    const merged = mergeAreaSpotMarkerMetadata(areaRaw, catalog);
    expect(merged[0].markerKind).toBe('merchant');
    expect(merged[0].isLocalPartner).toBe(true);
    expect(merged[0].merchantName).toBe('Kape Dagupan');
  });

  it('shows 3-item legend when partner markers exist and hides Local Partner when absent', () => {
    const withPartner = render(
      <MapMarkerLegend spots={[baseSpot({ markerKind: 'merchant', isLocalPartner: true })]} />,
    );
    expect(screen.getByText('Destination')).toBeTruthy();
    expect(screen.getByTestId('legend-local-partner').textContent).toContain('Local Partner');
    expect(screen.getByText('Quest Available')).toBeTruthy();
    withPartner.unmount();

    render(<MapMarkerLegend spots={[baseSpot({ markerKind: 'spot', isLocalPartner: false })]} />);
    expect(screen.getByText('Destination')).toBeTruthy();
    expect(screen.queryByTestId('legend-local-partner')).toBeNull();
    expect(screen.getByText('Quest Available')).toBeTruthy();
  });
});
