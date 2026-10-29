import { KNOWN_AREAS } from './areas';
import { api } from './api';
import { fallbackStoryStarters, type SpotRecognition } from './spot-posting';

export interface ReverseSuggestion {
  municipality: string;
  barangay?: string;
  province?: string;
  address: string;
  placeName?: string;
  outsidePangasinan: boolean;
}

export interface NominatimAddressDetails {
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  village?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  hamlet?: string;
  road?: string;
  state?: string;
  province?: string;
  region?: string;
  country?: string;
  postcode?: string;
  [key: string]: string | undefined;
}

export interface NominatimReverseResponse {
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  category?: string;
  type?: string;
  display_name?: string;
  address?: NominatimAddressDetails;
}

/** Haversine distance in meters between two lat/lng coordinates */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Find nearest known Pangasinan LGU / area fallback when reverse geocoding is unavailable */
export function getNearestAreaFallback(lat: number, lng: number): ReverseSuggestion {
  const candidates = KNOWN_AREAS.filter((a) => a.type === 'city' || a.type === 'municipality');
  let closest = candidates[0];
  let minDistance = Infinity;

  for (const candidate of candidates) {
    const dist = calculateHaversineMeters(lat, lng, candidate.center[0], candidate.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closest = candidate;
    }
  }

  const munName = closest ? closest.name : 'Pangasinan';
  return {
    municipality: munName,
    province: 'Pangasinan',
    address: `${munName}, Pangasinan`,
    outsidePangasinan: false,
  };
}

/** Formats a barangay name cleanly with standard prefix */
export function formatBarangayName(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^(barangay|brgy\.?|poblacion)/i.test(trimmed)) {
    return trimmed;
  }
  return `Barangay ${trimmed}`;
}

/** Check if category or type qualifies as a POI feature */
const POI_CATEGORIES = new Set(['amenity', 'tourism', 'leisure', 'natural', 'historic', 'shop']);

/** Map raw Nominatim reverse JSON to clean ReverseSuggestion */
export function mapNominatimReverse(
  data: NominatimReverseResponse,
  lat: number,
  lng: number
): ReverseSuggestion {
  const addr = data.address || {};

  // 1. Municipality
  const municipality = (
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.county ||
    ''
  ).trim();

  // 2. Barangay
  const rawBarangay =
    addr.village ||
    addr.suburb ||
    addr.quarter ||
    addr.neighbourhood ||
    addr.hamlet;
  const barangay = formatBarangayName(rawBarangay);

  // 3. Province
  const province = (addr.state || addr.province || addr.region || 'Pangasinan').trim();

  // 4. Place name (POI)
  let placeName: string | undefined = undefined;
  const isPoi = (data.category && POI_CATEGORIES.has(data.category)) || (data.type && POI_CATEGORIES.has(data.type));
  if (data.name && (isPoi || !addr.road || data.name.trim() !== addr.road.trim())) {
    placeName = data.name.trim();
  }

  // 5. Build clean human-readable address
  const road = addr.road?.trim();
  const addressParts: string[] = [];
  if (road) addressParts.push(road);
  if (barangay) addressParts.push(barangay);
  if (municipality) addressParts.push(municipality);
  if (province && province !== municipality) addressParts.push(province);

  let addressLine = addressParts.join(', ');
  if (!addressLine && data.display_name) {
    // Fallback to first 3 tokens of display_name
    addressLine = data.display_name.split(',').slice(0, 3).map((p) => p.trim()).join(', ');
  }

  if (placeName && road && placeName !== road && !addressLine.toLowerCase().includes(placeName.toLowerCase())) {
    addressLine = `Near ${placeName} — ${addressLine}`;
  }

  // 6. Outside Pangasinan detection
  const normalizedProvince = province.toLowerCase();
  const normalizedDisplayName = (data.display_name || '').toLowerCase();
  const isPangasinan =
    normalizedProvince.includes('pangasinan') ||
    normalizedDisplayName.includes('pangasinan');
  const outsidePangasinan = !isPangasinan;

  // If no municipality was determined, fall back to nearest known area
  if (!municipality) {
    const fallback = getNearestAreaFallback(lat, lng);
    const resolvedMun = fallback.municipality;
    const finalAddressParts = [];
    if (road) finalAddressParts.push(road);
    if (barangay) finalAddressParts.push(barangay);
    finalAddressParts.push(resolvedMun);
    if (province && province !== resolvedMun) finalAddressParts.push(province);
    const finalAddress = finalAddressParts.join(', ');

    return {
      municipality: resolvedMun,
      barangay,
      province,
      address: finalAddress || fallback.address,
      placeName,
      outsidePangasinan,
    };
  }

  return {
    municipality,
    barangay,
    province,
    address: addressLine || `${municipality}, ${province}`,
    placeName,
    outsidePangasinan,
  };
}

/**
 * Plan 66: recognize a map pin through the shared API (`GET /spots/recognize`), falling back to the
 * web's own `/api/osm/reverse` and then to offline suggestions, so posting never blocks on a lookup.
 */
export async function recognizeSpot(lat: number, lng: number, signal?: AbortSignal): Promise<SpotRecognition> {
  try {
    const response = await api.get('/spots/recognize', { params: { lat, lng }, signal, timeout: 5000 });
    const data = response.data?.data as SpotRecognition | undefined;
    if (data && typeof data.formatted_address === 'string') return data;
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  let suggestion: ReverseSuggestion | null = null;
  try {
    const res = await fetch(`/api/osm/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, { signal });
    if (res.ok) suggestion = ((await res.json()) as { suggestion?: ReverseSuggestion }).suggestion ?? null;
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  const area = suggestion ?? getNearestAreaFallback(lat, lng);
  const where = [area.barangay, area.municipality].filter(Boolean).join(', ');
  return {
    recognized: Boolean(area.municipality),
    source: 'client',
    place_name: area.placeName ?? null,
    name_suggestions: area.placeName ? [area.placeName] : area.municipality ? [`${area.municipality} Scenic Spot`] : [],
    formatted_address: area.address,
    municipality: area.municipality || null,
    barangay: area.barangay ?? null,
    province: area.province ?? null,
    road: null,
    outside_pangasinan: area.outsidePangasinan,
    suggested_category: 'nature_outdoors',
    suggested_subcategory: 'viewpoint',
    suggested_details: { good_for: ['groups', 'solo', 'couples'], best_time: ['early_morning', 'sunset'], amenities: ['parking'], daily_hours: '06:00 AM - 06:00 PM', contact_number: '' },
    story_starters: fallbackStoryStarters(where, 'nature_outdoors'),
    nearby_duplicates: [],
  };
}
