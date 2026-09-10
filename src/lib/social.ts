import { api } from './api';

export interface PublicTravelerSummary {
  id: string;
  display_name: string;
  handle: string | null;
  avatar_url: string;
  bio: string | null;
  status_text: string | null;
  scout_reputation: number;
  follower_count?: number;
  following_count?: number;
  is_unavailable?: boolean;
}

export interface UserRelationship {
  is_following: boolean;
  follows_you: boolean;
  can_follow: boolean;
  reason?: 'PROFILE_VISIBILITY_REQUIRED' | 'CANNOT_FOLLOW_SELF' | 'TARGET_NOT_FOUND';
}

export interface FollowPageResult {
  items: PublicTravelerSummary[];
  next_cursor: string | null;
  has_more: boolean;
}

/** Owner scope is authorized by the server token, never by a supplied user ID. */
export async function fetchTravelerList(userId: string, type: 'followers' | 'following', ownerView: boolean, cursor?: string): Promise<FollowPageResult> {
  const path = ownerView ? `/users/me/${type}` : `/users/${encodeURIComponent(userId)}/${type}`;
  try {
    const res = await api.get(path, { params: { limit: 20, ...(cursor ? { cursor } : {}) }, timeout: 10000 });
    const data = res.data?.data;
    if (!res.data?.success || !Array.isArray(data?.items)) throw new Error('Invalid traveler list response. Please retry.');
    return data;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 401) throw new Error('Please sign in again to view your connections.');
    if (status === 404) throw new Error('This profile is private or no longer available.');
    if (status === 429) throw new Error('Too many requests. Please wait a moment and retry.');
    throw new Error('Unable to load connections. Please check your connection and retry.');
  }
}

export interface AuthenticatedUserProfile {
  id: string;
  display_name: string;
  email: string;
  handle: string | null;
  avatar_url: string;
  bio: string | null;
  status_text: string | null;
  scout_reputation: number;
  is_public: boolean;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches public travelers for discovery rail (1-6 travelers).
 */
export async function fetchPublicTravelers(limit = 3): Promise<PublicTravelerSummary[]> {
  try {
    const res = await api.get('/users', { params: { limit } });
    if (res.data?.success && res.data?.data?.items) {
      return res.data.data.items as PublicTravelerSummary[];
    }
    throw new Error('Invalid traveler response. Please retry.');
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    throw new Error(status === 401 || status === 403
      ? 'Evaluator access expired or is not authorized. Check access and retry.'
      : 'Unable to load travelers. Please retry.');
  }
}

/**
 * Fetches relationship between current viewer and target traveler.
 */
export async function fetchUserRelationship(userId: string): Promise<UserRelationship | null> {
  try {
    const res = await api.get(`/users/${encodeURIComponent(userId)}/relationship`);
    if (res.data?.success && res.data?.data) {
      return res.data.data as UserRelationship;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Follows target traveler.
 */
export async function followUser(userId: string): Promise<{
  success: boolean;
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
  error?: { code: string; message: string };
}> {
  try {
    const res = await api.put(`/users/${encodeURIComponent(userId)}/follow`);
    if (res.data?.success && res.data?.data) {
      return {
        success: true,
        is_following: res.data.data.is_following,
        follower_count: res.data.data.follower_count,
        following_count: res.data.data.following_count,
      };
    }
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to follow.' } };
  } catch (err: any) {
    const error = err.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: err.message || 'Unable to follow traveler.',
    };
    return { success: false, error };
  }
}

/**
 * Unfollows target traveler.
 */
export async function unfollowUser(userId: string): Promise<{
  success: boolean;
  error?: { code: string; message: string };
}> {
  try {
    await api.delete(`/users/${encodeURIComponent(userId)}/follow`);
    return { success: true };
  } catch (err: any) {
    const error = err.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: err.message || 'Unable to unfollow traveler.',
    };
    return { success: false, error };
  }
}

/**
 * Lists followers for a public traveler.
 */
export async function fetchFollowers(
  userId: string,
  limit = 20,
  cursor?: string
): Promise<FollowPageResult | null> {
  try {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    const res = await api.get(`/users/${encodeURIComponent(userId)}/followers`, { params });
    if (res.data?.success && res.data?.data) {
      return res.data.data as FollowPageResult;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lists following for a public traveler.
 */
export async function fetchFollowing(
  userId: string,
  limit = 20,
  cursor?: string
): Promise<FollowPageResult | null> {
  try {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    const res = await api.get(`/users/${encodeURIComponent(userId)}/following`, { params });
    if (res.data?.success && res.data?.data) {
      return res.data.data as FollowPageResult;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches authenticated traveler's full profile and privacy settings.
 */
export async function fetchMyProfile(): Promise<AuthenticatedUserProfile | null> {
  try {
    const res = await api.get('/users/me/profile');
    if (res.data?.success && res.data?.data) {
      return res.data.data as AuthenticatedUserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Updates authenticated traveler's profile & visibility settings.
 */
export async function updateMyProfile(payload: {
  display_name?: string;
  is_public?: boolean;
  handle?: string | null;
  bio?: string | null;
  status_text?: string | null;
}): Promise<{
  success: boolean;
  profile?: AuthenticatedUserProfile;
  error?: { code: string; message: string };
}> {
  try {
    const res = await api.patch('/users/me/profile', payload);
    if (res.data?.success && res.data?.data) {
      return { success: true, profile: res.data.data as AuthenticatedUserProfile };
    }
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to update profile.' } };
  } catch (err: any) {
    const error = err.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: err.message || 'Unable to save profile.',
    };
    return { success: false, error };
  }
}

/**
 * Lists authenticated traveler's outgoing following edges (including private accounts).
 */
export async function fetchMyFollowing(
  limit = 20,
  cursor?: string
): Promise<FollowPageResult | null> {
  try {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;
    const res = await api.get('/users/me/following', { params });
    if (res.data?.success && res.data?.data) {
      return res.data.data as FollowPageResult;
    }
    return null;
  } catch {
    return null;
  }
}
