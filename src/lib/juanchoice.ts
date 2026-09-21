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
  replayed: boolean; policy_version: string;
}
export interface JuanChoiceSpotlight {
  kind: 'juanchoice_spotlight'; campaign_id: string; theme: string; region: string;
  valid_ballots: number; finalized_at: string; expires_at: string;
  winners: { candidate_id: string; spot_id: string; spot_slug: string; spot_name: string; municipality: string }[];
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
  if (campaign.status === 'scheduled' && now >= Date.parse(campaign.opens_at)) {
    return now < Date.parse(campaign.closes_at) ? 'voting' : 'closed';
  }
  if (campaign.status === 'voting' && now >= Date.parse(campaign.closes_at)) return 'closed';
  return campaign.status;
};

export async function listJuanChoiceCampaigns(signal?: AbortSignal): Promise<JuanChoiceCampaign[]> {
  const response = await api.get('/juanchoice/campaigns', { signal, timeout: 5000 });
  return response.data.data.items;
}
export async function getJuanChoiceCampaign(id: string, signal?: AbortSignal): Promise<JuanChoiceDetail> {
  const response = await api.get(`/juanchoice/campaigns/${encodeURIComponent(id)}`, { signal, timeout: 5000 });
  return response.data.data;
}
export async function getMyJuanChoiceBallot(id: string, signal?: AbortSignal): Promise<JuanChoiceBallot | null> {
  const response = await api.get(`/juanchoice/campaigns/${encodeURIComponent(id)}/me`, { signal, timeout: 5000 });
  return response.data.data.ballot;
}
export async function putJuanChoiceBallot(id: string, candidateId: string, expectedVersion: number, key = uuid()): Promise<JuanChoiceReceipt> {
  const response = await api.put(`/juanchoice/campaigns/${encodeURIComponent(id)}/ballot`,
    { candidate_id: candidateId, expected_version: expectedVersion }, { timeout: 12000, headers: { 'Idempotency-Key': key } });
  return response.data.data;
}
export function juanChoiceErrorCode(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error?.code ?? (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'NETWORK_ERROR' : 'REQUEST_FAILED');
  return 'REQUEST_FAILED';
}
