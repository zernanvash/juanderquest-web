import { api, uuid } from '@/lib/api';

export type TrailTier = 'starter' | 'explorer' | 'signature' | 'legendary' | 'personal';
export interface TrailCatalogItem {
  id: string; slug: string; title: string; tagline: string; tier: TrailTier; theme: string;
  municipalities: string[]; stop_count: number; total_minutes: number; total_km: number;
  unlock_rule: { type: string; price_points?: number; min_level?: number };
  available_until: string | null; rarity_art_key: string; is_unlocked: boolean;
  reward_points?: number;
}
/** A trail card in a destination's side panel (GET /trails/near). */
export interface NearbyTrail extends TrailCatalogItem {
  cover_image_url: string | null; passes_here: boolean; nearest_km: number; reward_points: number;
}
/** What a locked trail offers: names, photos and one line per stop; no order or map. */
export interface TrailPreviewStop { name: string; municipality: string; category: string; image_url: string | null; blurb: string }
export interface TrailStop {
  position: number; spot_id: string; name: string; municipality: string; category: string;
  lat: number; lng: number; narration: string; arrive_offset_min: number; dwell_min: number;
  leg_minutes: number; leg_km: number; checkin_radius_m: number; checked_in?: boolean;
  distance_m?: number; accuracy_m?: number;
}
export interface TrailDetail extends TrailCatalogItem {
  story?: { intro?: string; source?: 'ai' | 'template' };
  stops?: TrailStop[];
  is_unlocked: boolean;
  intro?: string;
  preview?: TrailPreviewStop[];
}
export interface PersonalTrailAllowance { free_remaining:number; price_points:number }

function responseData<T>(response: { data?: { success?: boolean; data?: T; error?: { message?: string } } }): T {
  if (!response.data?.success || response.data.data === undefined) throw new Error(response.data?.error?.message || 'Trail service is unavailable.');
  return response.data.data;
}

export async function fetchTrails(): Promise<{items:TrailCatalogItem[];personalGeneration:PersonalTrailAllowance|null}> {
  const data = responseData<{ items?: TrailCatalogItem[]; personal_generation?:PersonalTrailAllowance|null }>(await api.get('/trails'));
  return {items:data.items??[],personalGeneration:data.personal_generation??null};
}
export async function fetchTrailsNear(point: { lat: number; lng: number }, spotId?: string): Promise<NearbyTrail[]> {
  const data = responseData<{ items?: NearbyTrail[] }>(await api.get('/trails/near', { params: { lat: point.lat, lng: point.lng, ...(spotId ? { spot_id: spotId } : {}) } }));
  return data.items ?? [];
}
export const isHiyasTrail = (tier: TrailTier) => tier === 'signature' || tier === 'legendary';
export async function fetchTrail(id: string): Promise<TrailDetail> {
  return responseData<TrailDetail>(await api.get(`/trails/${encodeURIComponent(id)}`));
}
export async function unlockTrail(id: string) {
  return responseData<{ already_unlocked: boolean; price_points: number }>(await api.post(`/trails/${encodeURIComponent(id)}/unlock`, {}, {
    headers: { 'Idempotency-Key': uuid() },
  }));
}
export async function checkInTrailStop(id: string, position: number, location: { lat: number; lng: number; accuracy_m: number }) {
  return responseData<{ progress: TrailStop[]; completion: null | { reward_points: number } }>(await api.post(
    `/trails/${encodeURIComponent(id)}/stops/${position}/checkin`, location,
  ));
}
export async function createPersonalTrail(input: {
  text?: string; themes?: string[]; good_for?: string[]; municipalities?: string[];
  budget_min: number; pace: 'relaxed' | 'balanced' | 'packed'; start?: { lat: number; lng: number };
}) {
  return responseData<{ trail: TrailDetail; charged_points: number; free_generation_remaining: number }>(await api.post('/trails/personal', input, {
    headers: { 'Idempotency-Key': uuid() },
  }));
}
