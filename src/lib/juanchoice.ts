import axios from 'axios';
import { api, uuid } from './api';

export type JuanChoiceStatus = 'draft' | 'scheduled' | 'voting' | 'closed' | 'finalized' | 'archived' | 'cancelled';
export interface JuanChoiceCampaign {
  id: string; slug: string; region: string; theme: string; status: JuanChoiceStatus;
  opens_at: string; closes_at: string; policy_version: string;
}
export interface JuanChoiceStanding {
  candidate_id: string; spot_id: string; spot_slug?: string; spot_name?: string; votes: number;
}
export interface JuanChoiceDetail {
  campaign: JuanChoiceCampaign;
  standings: JuanChoiceStanding[];
  result: { co_winner_ids: string[]; valid_ballots: number; finalized_at: string } | null;
}
export interface JuanChoiceBallot { candidate_id: string; version: number }
export interface JuanChoiceReceipt {
  ballot: JuanChoiceBallot;
  participation: { civic_xp: 25; stamps: 1; token_grant_mjdq: '0' };
  replayed: boolean; policy_version: string; server_time?: string;
}
export interface JuanChoiceMyState {
  ballot: JuanChoiceBallot | null;
  eligibility: { eligible: boolean; reason: 'ACCOUNT_TOO_NEW' | 'UNAVAILABLE' | null; eligible_at: string | null };
  can_vote_now: boolean;
  vote_unavailable_reason: string | null;
  server_time: string | null;
}
export interface JuanChoiceSpotlight {
  kind: 'juanchoice_spotlight'; campaign_id: string; theme: string; region: string;
  valid_ballots: number; finalized_at: string; expires_at: string;
  winners: { candidate_id: string; spot_id: string; spot_slug: string; spot_name: string; municipality: string }[];
}

export interface JuanChoiceOverview {
  environment?: 'presentation_demo';
  server_time:string;
  region:{key:string;label:string;timezone:string};
  view:'open'|'between';
  availability:{voting_enabled:boolean;reason:string|null};
  current:(JuanChoiceCampaign&{period_start:string})|null;
  next:{opens_at:string;closes_at:string;theme:string|null;schedule_status:'scheduled'|'postponed'}|null;
  previous:{campaign_id:string;period_label:string;opens_at:string;closes_at:string;finalized_at:string;
    theme:string;valid_ballots:number;co_winner_ids:string[];standings:JuanChoiceStanding[]}|null;
  notice:{code:string;message:string}|null;
}

export async function getJuanChoiceOverview(signal?:AbortSignal):Promise<JuanChoiceOverview>{
  const response=await api.get('/juanchoice/overview',{signal,timeout:5000});
  return response.data.data;
}

export function planJuanChoicePlacement<T extends { id: string }>(spots: T[], spotlight: JuanChoiceSpotlight | null, now = Date.now()) {
  if (!spotlight || !Number.isFinite(Date.parse(spotlight.expires_at)) || Date.parse(spotlight.expires_at) <= now || !spotlight.winners.length) {
    return { spotlight: null, ordinary: spots, insertionIndex: -1 };
  }
  const promotedIds = new Set(spotlight.winners.map(winner => winner.spot_id));
  const ordinary = spots.filter(spot => !promotedIds.has(spot.id));
  return { spotlight, ordinary, insertionIndex: Math.min(3, ordinary.length) };
}

export async function getPublicJuanChoiceSpotlight(signal?: AbortSignal): Promise<JuanChoiceSpotlight | null> {
  const response = await api.get('/juanchoice/spotlight', { signal, timeout: 5000 });
  return response.data.data;
}

export const effectiveJuanChoiceStatus = (campaign: JuanChoiceCampaign, now = Date.now()): JuanChoiceStatus => {
  if (campaign.status === 'voting' && now < Date.parse(campaign.opens_at)) return 'scheduled';
  if (campaign.status === 'scheduled' && now >= Date.parse(campaign.opens_at)) {
    return now < Date.parse(campaign.closes_at) ? 'voting' : 'closed';
  }
  if (campaign.status === 'voting' && now >= Date.parse(campaign.closes_at)) return 'closed';
  return campaign.status;
};

/** Advance a trusted server timestamp with a monotonic client timer, not the device wall clock. */
export function serverAlignedNow(serverTime: string, receivedAtMono: number, currentMono: number): number | null {
  const serverMs = Date.parse(serverTime);
  if (!Number.isFinite(serverMs) || !Number.isFinite(receivedAtMono) || !Number.isFinite(currentMono)) return null;
  return serverMs + Math.max(0, currentMono - receivedAtMono);
}

export async function listJuanChoiceCampaigns(signal?: AbortSignal): Promise<JuanChoiceCampaign[]> {
  const response = await api.get('/juanchoice/campaigns', { signal, timeout: 5000 });
  return response.data.data.items;
}
export async function getJuanChoiceCampaign(id: string, signal?: AbortSignal): Promise<JuanChoiceDetail> {
  const response = await api.get(`/juanchoice/campaigns/${encodeURIComponent(id)}`, { signal, timeout: 5000 });
  return response.data.data;
}
export function normalizeMyJuanChoiceState(data: Partial<JuanChoiceMyState> | null): JuanChoiceMyState {
  if (!data?.eligibility || typeof data.eligibility.eligible !== 'boolean'
    || typeof data.can_vote_now !== 'boolean' || !data.server_time
    || !Number.isFinite(Date.parse(data.server_time))) {
    return { ballot: data?.ballot ?? null,
      eligibility: { eligible: false, reason: 'UNAVAILABLE', eligible_at: null },
      can_vote_now: false, vote_unavailable_reason: 'ELIGIBILITY_UNAVAILABLE', server_time: null };
  }
  return { ...data, ballot: data.ballot ?? null, vote_unavailable_reason: data.vote_unavailable_reason ?? null } as JuanChoiceMyState;
}
export async function getMyJuanChoiceState(id: string, signal?: AbortSignal): Promise<JuanChoiceMyState> {
  const response = await api.get(`/juanchoice/campaigns/${encodeURIComponent(id)}/me`, { signal, timeout: 5000 });
  return normalizeMyJuanChoiceState(response.data.data);
}
export async function putJuanChoiceBallot(id: string, candidateId: string, expectedVersion: number, key = uuid()): Promise<JuanChoiceReceipt> {
  const response = await api.put(`/juanchoice/campaigns/${encodeURIComponent(id)}/ballot`,
    { candidate_id: candidateId, expected_version: expectedVersion }, { timeout: 12000, headers: { 'Idempotency-Key': key } });
  return response.data.data;
}
export function juanChoiceErrorCode(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) return 'RATE_LIMITED';
    if (error.response?.data?.error?.code) return error.response.data.error.code;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'TIMEOUT';
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return 'NETWORK_ERROR';
    return 'REQUEST_FAILED';
  }
  return 'REQUEST_FAILED';
}
