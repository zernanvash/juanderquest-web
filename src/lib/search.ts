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
  created_at: string;
}

/**
 * Looks up real public traveler profile by ID or @handle.
 */
export async function fetchPublicUserProfile(idOrHandle: string): Promise<PublicUserProfile | null> {
  try {
    const res = await api.get(`/users/${encodeURIComponent(idOrHandle)}/profile`);
    if (res.data?.success && res.data?.data) {
      return res.data.data as PublicUserProfile;
    }
    return null;
  } catch {
    return null;
  }
}
