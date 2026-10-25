import { api, uuid } from '@/lib/api';

export type TrailTier = 'starter' | 'explorer' | 'signature' | 'legendary' | 'personal';
export interface TrailCatalogItem {
  id: string; slug: string; title: string; tagline: string; tier: TrailTier; theme: string;
  municipalities: string[]; stop_count: number; total_minutes: number; total_km: number;
  unlock_rule: { type: string; price_points?: number; min_level?: number };
  available_until: string | null; rarity_art_key: string; is_unlocked: boolean;
}
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
