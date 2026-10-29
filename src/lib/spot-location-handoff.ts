// Plan 70: /map/add-spot always has a location. Resolution order:
//   1. ?lat&lng from the map (plus the recognition the map already fetched, via sessionStorage)
//   2. the saved draft (survives refresh, sign-in redirects, the camera app evicting the tab)
//   3. device GPS / photo EXIF (applied after mount by the studio)
//   4. the last map view, else Lingayen Capitol
// Storage can be unavailable (private mode, blocked site data); every access is guarded.
import { insidePhilippines } from './exif-gps';
import type { SpotPostingDraft, SpotRecognition } from './spot-posting';

export type SpotLocationSource = 'map-crosshair' | 'user-gps' | 'photo-exif' | 'map-viewport' | 'fallback-anchor' | 'draft';
export interface StudioPin { lat: number; lng: number; zoom: number }
export interface SpotLocationHandoffPayload {
  pin: StudioPin;
  source: SpotLocationSource;
  recognition: SpotRecognition | null;
  createdAt: number;
}
export interface SavedSpotDraft {
  pin: StudioPin;
  source: SpotLocationSource;
  draft: SpotPostingDraft;
  recognition: SpotRecognition | null;
  savedAt: number;
}
export interface InitialSpotLocation {
  pin: StudioPin;
  source: SpotLocationSource;
  recognition: SpotRecognition | null;
  draft: SpotPostingDraft | null;
}

export const HANDOFF_KEY = 'jdq_spot_handoff_v1';
export const DRAFT_KEY = 'jdq_spot_draft_v1';
export const LAST_MAP_CENTER_KEY = 'jdq_last_map_center';
export const LINGAYEN_ANCHOR: StudioPin = { lat: 16.0294, lng: 120.2289, zoom: 15 };
const HANDOFF_TTL_MS = 30 * 60 * 1000;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MATCH_DEGREES = 0.0002;

const read = (storage: 'session' | 'local', key: string): unknown => {
  try {
    const raw = (storage === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const write = (storage: 'session' | 'local', key: string, value: unknown | null) => {
  try {
    const target = storage === 'session' ? window.sessionStorage : window.localStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the URL still carries the pin.
  }
};

const clampZoom = (zoom: unknown, fallback = 17) => {
  const value = Number(zoom);
  return Number.isFinite(value) ? Math.min(19, Math.max(8, Math.round(value))) : fallback;
};
export const validPin = (lat: unknown, lng: unknown, zoom?: unknown): StudioPin | null => {
  const la = Number(lat), lo = Number(lng);
  return insidePhilippines(la, lo) ? { lat: la, lng: lo, zoom: clampZoom(zoom) } : null;
};
const samePlace = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.abs(a.lat - b.lat) <= MATCH_DEGREES && Math.abs(a.lng - b.lng) <= MATCH_DEGREES;

export function saveSpotHandoff(payload: Omit<SpotLocationHandoffPayload, 'createdAt'>) {
  write('session', HANDOFF_KEY, { ...payload, createdAt: Date.now() });
}

/** The map's recognition for this pin, if it is fresh and for the same place. */
export function consumeSpotHandoff(pin: { lat: number; lng: number } | null, now = Date.now()): SpotLocationHandoffPayload | null {
  const value = read('session', HANDOFF_KEY) as SpotLocationHandoffPayload | null;
  if (!value?.pin || now - Number(value.createdAt) > HANDOFF_TTL_MS) return null;
  if (pin && !samePlace(pin, value.pin)) return null;
  return value;
}

export function saveSpotDraft(value: Omit<SavedSpotDraft, 'savedAt'>) {
  write('local', DRAFT_KEY, { ...value, savedAt: Date.now() });
}
export function loadSpotDraft(now = Date.now()): SavedSpotDraft | null {
  const value = read('local', DRAFT_KEY) as SavedSpotDraft | null;
  if (!value?.pin || !validPin(value.pin.lat, value.pin.lng) || now - Number(value.savedAt) > DRAFT_TTL_MS) return null;
  return value;
}
export function clearSpotDraft() {
  write('local', DRAFT_KEY, null);
  write('session', HANDOFF_KEY, null);
}

export function saveLastMapCenter(pin: { lat: number; lng: number; zoom?: number }) {
  if (validPin(pin.lat, pin.lng)) write('local', LAST_MAP_CENTER_KEY, { lat: pin.lat, lng: pin.lng, zoom: pin.zoom ?? 15 });
}
export function loadLastMapCenter(): StudioPin | null {
  const value = read('local', LAST_MAP_CENTER_KEY) as StudioPin | null;
  return value ? validPin(value.lat, value.lng, value.zoom ?? 15) : null;
}

/** Tiers 1, 2 and 4, synchronously: a valid pin exists from the very first render. */
export function resolveInitialSpotLocation(params: { get(name: string): string | null }): InitialSpotLocation {
  const fromUrl = validPin(params.get('lat'), params.get('lng'), params.get('zoom'));
  const draft = loadSpotDraft();
  if (fromUrl) {
    // A refresh mid-edit keeps the URL pin and the draft that belongs to it.
    const sameDraft = draft && samePlace(fromUrl, draft.pin) ? draft : null;
    const handoff = consumeSpotHandoff(fromUrl);
    return {
      pin: fromUrl,
      source: sameDraft?.source ?? handoff?.source ?? 'map-crosshair',
      recognition: sameDraft?.recognition ?? handoff?.recognition ?? null,
      draft: sameDraft?.draft ?? null,
    };
  }
  if (draft) return { pin: draft.pin, source: 'draft', recognition: draft.recognition, draft: draft.draft };
  const last = loadLastMapCenter();
  if (last) return { pin: last, source: 'map-viewport', recognition: null, draft: null };
  return { pin: LINGAYEN_ANCHOR, source: 'fallback-anchor', recognition: null, draft: null };
}

/** Pins the traveler did not aim deliberately may be moved by GPS or a photo's location. */
export const isSoftPin = (source: SpotLocationSource) => source === 'map-viewport' || source === 'fallback-anchor';

export const addSpotHref = (pin?: { lat: number; lng: number; zoom?: number }) =>
  pin ? `/map/add-spot?lat=${pin.lat.toFixed(6)}&lng=${pin.lng.toFixed(6)}&zoom=${clampZoom(pin.zoom)}` : '/map/add-spot';
