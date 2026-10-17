export interface SpotPostingPin {
  lat: number;
  lng: number;
}

export const PHILIPPINE_GPS_BOUNDS = {
  minLat: 4.5,
  maxLat: 21.5,
  minLng: 116,
  maxLng: 127,
} as const;

export const SPOT_POSTING_CATEGORIES = [
  {
    id: 'eat_drink',
    label: '🍜 Food & Culinary',
    subcategories: ['kaleskes', 'bangus_grill', 'puto_calasiao', 'seafood_shack', 'tupig_stand', 'third_wave_coffee'],
  },
  {
    id: 'nature_outdoors',
    label: '🏖️ Nature & Beaches',
    subcategories: ['white_sand_beach', 'waterfall', 'cave_system', 'island_cove', 'tidal_pool', 'mountain_viewpoint'],
  },
  {
    id: 'culture_heritage',
    label: '🏛️ Heritage & Shrines',
    subcategories: ['colonial_church', 'historical_lighthouse', 'heritage_mansion', 'provincial_capitol', 'shrine_monument'],
  },
  {
    id: 'activities_wellness',
    label: '🧗 Outdoor & Eco',
    subcategories: ['island_hopping', 'snorkeling_dive', 'mangrove_paddling', 'eco_trail_hike', 'campground'],
  },
  {
    id: 'shopping_local',
    label: '🛍️ Local MSME Crafts',
    subcategories: ['bagoong_distillery', 'salt_beds_farm', 'bamboo_crafts', 'night_market', 'local_cooperative'],
  },
] as const;

export const SPOT_POSTING_AMENITIES = [
  'parking',
  'restrooms',
  'food_nearby',
  'guide_available',
  'cottage_rentals',
  'boat_service',
  'wifi_signal',
  'pwd_accessible',
] as const;

export const SPOT_GOOD_FOR = [
  { id: 'families', label: '👨‍👩‍👧 Families & kids' },
  { id: 'solo', label: '🎒 Solo travelers' },
  { id: 'couples', label: '💑 Couples' },
  { id: 'groups', label: '👯 Groups & barkada' },
  { id: 'seniors_access', label: '🧓 Seniors / limited mobility' },
] as const;

export const SPOT_BEST_TIME = [
  { id: 'early_morning', label: '🌅 Early morning' },
  { id: 'daytime', label: '☀️ Daytime' },
  { id: 'sunset', label: '🌇 Sunset' },
  { id: 'night', label: '🌙 Night' },
  { id: 'weekdays', label: '📅 Weekdays (fewer crowds)' },
  { id: 'dry_season', label: '🏖️ Dry season (Nov–May)' },
  { id: 'rainy_season', label: '🌧️ Also good in rainy season' },
] as const;

export const SPOT_POSTING_MEDIA_LIMITS = {
  image: 8 * 1024 * 1024,
  video: 30 * 1024 * 1024,
} as const;

export function validatePostingMediaFile(file: File): string | null {
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? SPOT_POSTING_MEDIA_LIMITS.video : SPOT_POSTING_MEDIA_LIMITS.image;
  if (file.size > maxSize) {
    return `File is too large. Max ${isVideo ? '30 MB for video' : '8 MB for photos'}.`;
  }
  return null;
}

export type SpotPostingStepId = 'basics' | 'story' | 'place' | 'details' | 'media' | 'review';

export const SPOT_POSTING_STEPS: ReadonlyArray<{ id: SpotPostingStepId; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'story', label: 'Story' },
  { id: 'place', label: 'Place' },
  { id: 'details', label: 'Details' },
  { id: 'media', label: 'Photo' },
  { id: 'review', label: 'Review' },
];

export interface SpotPostingDraft {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  municipality: string;
  address: string;
  pin: SpotPostingPin | null;
  dailyHours: string;
  goodFor: string[];
  bestTime: string[];
  tags: string[];
  amenities: string[];
}

export function createSpotPostingDraft(pin: SpotPostingPin | null = null): SpotPostingDraft {
  return {
    name: '',
    category: 'nature_outdoors',
    subcategory: 'white_sand_beach',
    description: '',
    municipality: '',
    address: '',
    pin,
    dailyHours: '',
    goodFor: [],
    bestTime: [],
    tags: [],
    amenities: [],
  };
}

export function subcategoriesForCategory(categoryId: string): readonly string[] {
  return SPOT_POSTING_CATEGORIES.find((c) => c.id === categoryId)?.subcategories ?? [];
}

export function validatePostingPin(pin: SpotPostingPin | null): string | null {
  if (!pin) return 'Place the destination pin on the map first.';
  if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) {
    return 'The pin coordinates must be valid numbers.';
  }
  if (
    pin.lat < PHILIPPINE_GPS_BOUNDS.minLat ||
    pin.lat > PHILIPPINE_GPS_BOUNDS.maxLat ||
    pin.lng < PHILIPPINE_GPS_BOUNDS.minLng ||
    pin.lng > PHILIPPINE_GPS_BOUNDS.maxLng
  ) {
    return 'Place the pin inside the Philippines and try again.';
  }
  return null;
}

export function validatePostingStep(
  step: SpotPostingStepId,
  draft: SpotPostingDraft
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 'basics' || step === 'review') {
    const name = draft.name.trim();
    if (name.length < 3) errors.name = 'Destination name must be at least 3 characters.';
    else if (name.length > 200) errors.name = 'Destination name must be at most 200 characters.';
    if (!SPOT_POSTING_CATEGORIES.some((c) => c.id === draft.category)) {
      errors.category = 'Choose a valid category.';
    }
    const subcategory = draft.subcategory.trim();
    if (subcategory.length < 2 || subcategory.length > 50) {
      errors.subcategory = 'Choose a subcategory for this destination.';
    }
  }

  if (step === 'story' || step === 'review') {
    const description = draft.description.trim();
    if (description.length < 20) errors.description = 'Description must be at least 20 characters.';
    else if (description.length > 2000) errors.description = 'Description must be at most 2000 characters.';
  }

  if (step === 'place' || step === 'review') {
    const municipality = draft.municipality.trim();
    if (municipality.length < 2 || municipality.length > 100) {
      errors.municipality = 'Municipality or city is required.';
    }
    const address = draft.address.trim();
    if (address.length < 3 || address.length > 300) {
      errors.address = 'Address or landmark description is required.';
    }
    const pinError = validatePostingPin(draft.pin);
    if (pinError) errors.pin = pinError;
  }

  if (step === 'details' || step === 'review') {
    if (draft.goodFor.length > 5) {
      errors.goodFor = 'Choose at most 5 visitor fit tags.';
    }
    for (const item of draft.goodFor) {
      if (!SPOT_GOOD_FOR.some((g) => g.id === item)) {
        errors.goodFor = 'Invalid visitor fit selection.';
        break;
      }
    }

    if (draft.bestTime.length > 4) {
      errors.bestTime = 'Choose at most 4 best time tags.';
    }
    for (const item of draft.bestTime) {
      if (!SPOT_BEST_TIME.some((b) => b.id === item)) {
        errors.bestTime = 'Invalid best time selection.';
        break;
      }
    }

    if (draft.amenities.length > 20) {
      errors.amenities = 'Choose at most 20 amenities.';
    }
    if (draft.dailyHours.trim().length > 80) {
      errors.dailyHours = 'Operating hours must be at most 80 characters.';
    }
  }

  return errors;
}

export const SPOT_POSTING_BASE_STEPS: ReadonlyArray<Exclude<SpotPostingStepId, 'media' | 'review'>> = [
  'basics',
  'story',
  'place',
  'details',
];

export function firstInvalidPostingStep(draft: SpotPostingDraft): SpotPostingStepId | null {
  for (const step of SPOT_POSTING_BASE_STEPS) {
    if (Object.keys(validatePostingStep(step, draft)).length > 0) return step;
  }
  return null;
}

export function buildSpotPayload(
  draft: SpotPostingDraft,
  media: { assetId?: string | null; imageUrl?: string | null } = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    subcategory: draft.subcategory.trim(),
    tags: draft.tags,
    municipality: draft.municipality.trim(),
    address: draft.address.trim(),
    gps_lat: draft.pin?.lat,
    gps_lng: draft.pin?.lng,
    good_for: draft.goodFor,
    best_time: draft.bestTime,
    hours: draft.dailyHours.trim() ? { daily: draft.dailyHours.trim() } : {},
    amenities: draft.amenities,
    image_url: media.imageUrl || '',
  };
  if (media.assetId) {
    payload.asset_id = media.assetId;
    payload.asset_ids = [media.assetId];
  }
  return payload;
}
