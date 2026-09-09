import { api } from './api';

export interface PlaceResultItem {
  id: string;
  slug: string;
  name: string;
  municipality: string;
  category: string;
  image_url: string;
  score?: number;
}

export interface PersonResultItem {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string;
  bio: string | null;
  status_text: string | null;
  score?: number;
}

export interface QuestResultItem {
  id: string;
  title: string;
  location_name: string;
  category: string;
  reward_points: number;
  score?: number;
}

export interface SearchGroup {
  type: 'places' | 'people' | 'quests';
  items: Array<PlaceResultItem | PersonResultItem | QuestResultItem>;
  has_more: boolean;
  total_matches?: number;
}

export interface SearchResponseData {
  groups?: SearchGroup[];
  items?: Array<PlaceResultItem | PersonResultItem | QuestResultItem>;
  cursor?: string | null;
  has_more?: boolean;
  total_matches?: number;
}

export interface SearchApiResponse {
  success: boolean;
  data: SearchResponseData;
  meta: {
    query: string;
    mode: 'preview' | 'results';
    type: 'all' | 'places' | 'people' | 'quests';
    ranking_version: string;
    partial: boolean;
    unavailable_types: string[];
  };
}

/**
 * Normalizes query using Unicode NFKC, trims, and collapses repeated whitespace.
 */
export function normalizeSearchQuery(query: string): string {
  if (!query) return '';
  return query.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

/**
 * Validates if the query contains at least 2 Unicode alphanumeric characters.
 * Bare symbols, whitespace, single letters, or emoji-only queries are idle, not searches.
 */
export function isProcessableQuery(query: string): boolean {
  if (!query) return false;
  const normalized = normalizeSearchQuery(query);
  if (normalized.length > 100) return false;
  const alphanumericMatches = normalized.match(/[\p{L}\p{N}]/gu);
  return Boolean(alphanumericMatches && alphanumericMatches.length >= 2);
}

/**
 * Fetches compact search preview (maximum 8 items total, at most 4 per type).
 */
export async function fetchSearchPreview(
  query: string,
  type: 'all' | 'places' | 'people' | 'quests' = 'all',
  signal?: AbortSignal
): Promise<SearchApiResponse> {
  const normalized = normalizeSearchQuery(query);
  if (!isProcessableQuery(normalized)) {
    throw new Error('Query does not meet minimum processable criteria (at least 2 alphanumeric characters).');
  }

  const res = await api.get('/search', {
    params: {
      q: normalized,
      type,
      mode: 'preview',
    },
    signal,
  });

  return res.data;
}

/**
 * Fetches full search results with optional cursor pagination.
 */
export async function fetchSearchResults(
  query: string,
  type: 'all' | 'places' | 'people' | 'quests' = 'all',
  cursor?: string,
  limit = 20,
  signal?: AbortSignal
): Promise<SearchApiResponse> {
  const normalized = normalizeSearchQuery(query);
  if (!isProcessableQuery(normalized)) {
    throw new Error('Query does not meet minimum processable criteria (at least 2 alphanumeric characters).');
  }

  const params: Record<string, string | number> = {
    q: normalized,
    type,
    mode: 'results',
    limit,
  };
  if (cursor) {
    params.cursor = cursor;
  }

  const res = await api.get('/search', {
    params,
    signal,
  });

  return res.data;
}

export interface PublicUserProfile {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string;
  bio: string | null;
  status_text: string | null;
  scout_reputation: number;
  is_public: boolean;
  follower_count?: number;
  following_count?: number;
  created_at: string;
}

export type FetchUserProfileResult =
  | { kind: 'success'; profile: PublicUserProfile }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string; statusCode?: number };

export function getServerApiBaseUrl(): string {
  const configured =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configured && configured.startsWith('http')) {
    return configured.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:4000/api/v1';
}

/**
 * Looks up real public traveler profile by ID or @handle.
 * Distinguishes true 404 from 500/timeout/network errors.
 */
export async function fetchPublicUserProfile(
  idOrHandle: string
): Promise<FetchUserProfileResult> {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer
    ? getServerApiBaseUrl()
    : (process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1');
  const cleanBase = baseUrl.replace(/\/$/, '');
  const url = `${cleanBase}/users/${encodeURIComponent(idOrHandle)}/profile`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return { kind: 'not_found' };
    }

    if (!res.ok) {
      return {
        kind: 'error',
        message: `Unable to load traveler profile (HTTP ${res.status}).`,
        statusCode: res.status,
      };
    }

    const body = await res.json();
    if (body?.success && body?.data) {
      return { kind: 'success', profile: body.data as PublicUserProfile };
    }

    return {
      kind: 'error',
      message: 'Unexpected profile payload received from server.',
    };
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { kind: 'error', message: 'Profile request timed out. Please try again.' };
    }
    return {
      kind: 'error',
      message: 'Network connection failed while loading traveler profile.',
    };
  }
}
