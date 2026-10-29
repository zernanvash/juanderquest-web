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
  {
    id: 'stay',
    label: '🛏️ Stay & Lodging',
    subcategories: ['beach_resort', 'boutique_hotel', 'homestay', 'campground'],
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

// --- Plan 66: one-flow posting with place recognition ---------------------------------------

/** GET /api/v1/spots/recognize payload (snake_case, as sent by the API). */
export interface SpotRecognition {
  recognized: boolean;
  source: 'osm' | 'areas' | 'none' | 'client';
  place_name: string | null;
  name_suggestions: string[];
  formatted_address: string;
  municipality: string | null;
  barangay: string | null;
  province: string | null;
  road: string | null;
  outside_pangasinan: boolean;
  suggested_category: string;
  suggested_subcategory: string;
  suggested_details: { good_for: string[]; best_time: string[]; amenities: string[]; daily_hours: string; contact_number: string };
  story_starters: string[];
  nearby_duplicates: Array<{ id: string; slug: string; name: string; category: string; municipality: string; distance_meters: number }>;
}

/** Which draft fields the traveler has edited by hand; recognition never overwrites those. */
export interface SpotPostingTouched {
  name?: boolean;
  category?: boolean;
  location?: boolean;
  details?: boolean;
}

/** API taxonomy subcategory -> this composer's subcategory chips. */
const SUBCATEGORY_FROM_API: Record<string, string> = {
  beach: 'white_sand_beach', waterfall: 'waterfall', cave: 'cave_system', viewpoint: 'mountain_viewpoint', park: 'mountain_viewpoint',
  trailhead: 'mountain_viewpoint', restaurant: 'bangus_grill', carinderia: 'kaleskes', cafe: 'third_wave_coffee', bakery: 'puto_calasiao',
  street_food: 'tupig_stand', bar: 'seafood_shack', church: 'colonial_church', museum: 'heritage_mansion', heritage_site: 'heritage_mansion',
  arts_crafts: 'heritage_mansion', water_activity: 'island_hopping', recreation: 'eco_trail_hike', sports_venue: 'eco_trail_hike',
  running_spot: 'eco_trail_hike', gym: 'eco_trail_hike', market: 'night_market', souvenir: 'bamboo_crafts', local_products: 'local_cooperative',
  resort: 'beach_resort', hotel: 'boutique_hotel', homestay: 'homestay', campsite: 'campground',
};

export function toPostingSubcategory(category: string, apiSubcategory: string): string {
  const options = subcategoriesForCategory(category);
  if (options.includes(apiSubcategory)) return apiSubcategory;
  const mapped = SUBCATEGORY_FROM_API[apiSubcategory];
  return mapped && options.includes(mapped) ? mapped : options[0] ?? apiSubcategory;
}

const pick = (values: string[], allowed: ReadonlyArray<string>) => values.filter(value => allowed.includes(value));

/** Fills untouched fields from a recognition result. Never overwrites what the traveler typed. */
export function applyRecognitionToDraft(draft: SpotPostingDraft, rec: SpotRecognition, touched: SpotPostingTouched = {}): SpotPostingDraft {
  const next = { ...draft };
  if (!touched.location) {
    if (rec.municipality) next.municipality = rec.municipality;
    if (rec.formatted_address) next.address = rec.formatted_address;
  }
  if (!touched.name && rec.place_name) next.name = rec.place_name;
  if (!touched.category && SPOT_POSTING_CATEGORIES.some(c => c.id === rec.suggested_category)) {
    next.category = rec.suggested_category;
    next.subcategory = toPostingSubcategory(rec.suggested_category, rec.suggested_subcategory);
  }
  if (!touched.details) {
    next.goodFor = pick(rec.suggested_details.good_for, SPOT_GOOD_FOR.map(item => item.id)).slice(0, 5);
    next.bestTime = pick(rec.suggested_details.best_time, SPOT_BEST_TIME.map(item => item.id)).slice(0, 4);
    next.amenities = pick(rec.suggested_details.amenities, SPOT_POSTING_AMENITIES);
    next.dailyHours = rec.suggested_details.daily_hours ?? '';
  }
  return next;
}

/** Offline starters when the API cannot be reached; each is long enough to satisfy the description minimum. */
export function fallbackStoryStarters(where: string, category: string): string[] {
  const place = where || 'this area';
  const lines: Record<string, string[]> = {
    eat_drink: [`A local food stop in ${place} worth trying for a hearty meal.`, 'Ask the staff for their best-selling dish and what is fresh today.'],
    culture_heritage: [`A meaningful place in ${place} with a story worth learning about.`, 'Please dress modestly and keep voices low during services and events.'],
    stay: [`A comfortable place to stay in ${place} as a base for exploring.`, 'Book ahead on weekends and holidays, and ask about inclusions.'],
  };
  return lines[category] ?? [`A scenic spot in ${place} with relaxing views and fresh air.`, 'Best visited in the early morning or late afternoon; bring water and sun protection.'];
}

/** Appends a starter sentence to the description, avoiding duplicates. */
export function appendStoryStarter(description: string, starter: string): string {
  const current = description.trim();
  if (current.includes(starter)) return description;
  return current ? `${current} ${starter}` : starter;
}

/** One clear prompt for the sticky publish bar, or null when the draft is ready. */
export function postingReadiness(draft: SpotPostingDraft): string | null {
  const errors = validatePostingStep('review', draft);
  if (errors.pin) return 'Place the pin on the map';
  if (errors.name) return 'Add a name for this place';
  if (errors.description) return 'Tap a story starter or add a short description';
  if (errors.municipality || errors.address) return 'Add the town and a landmark';
  const first = Object.values(errors)[0];
  return first ?? null;
}
