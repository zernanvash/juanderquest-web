import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { fetchTravelerList } from './social';
import {
  fetchPublicUserProfile,
  getServerApiBaseUrl,
} from './search';
import {
  fetchPublicTravelers,
  fetchUserRelationship,
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
  updateMyProfile,
} from './social';

describe('Public User Profile & Social Graph Client (web_app)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getServerApiBaseUrl', () => {
    it('returns internal API URL or fallback', () => {
      const url = getServerApiBaseUrl();
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('fetchPublicUserProfile error handling', () => {
    it('returns { kind: "not_found" } on HTTP 404 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      } as any);

      const result = await fetchPublicUserProfile('non-existent-user');
      expect(result.kind).toBe('not_found');
    });

    it('returns { kind: "error" } on HTTP 500 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
      } as any);

      const result = await fetchPublicUserProfile('error-user');
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.statusCode).toBe(500);
        expect(result.message).toContain('HTTP 500');
      }
    });

    it('returns { kind: "error" } on network timeout or abort', async () => {
      const timeoutErr = new Error('Timeout');
      timeoutErr.name = 'TimeoutError';
      globalThis.fetch = vi.fn().mockRejectedValue(timeoutErr);

      const result = await fetchPublicUserProfile('timeout-user');
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.message).toContain('timed out');
      }
    });

    it('returns { kind: "success", profile } on valid 200 response', async () => {
      const mockProfile = {
        id: '11111111-1111-1111-1111-111111111111',
        display_name: 'Juan Dela Cruz',
        handle: 'juandelacruz',
        avatar_url: 'https://avatar.com/1.png',
        bio: 'Explorer',
        status_text: 'Active',
        scout_reputation: 250,
        is_public: true,
        follower_count: 12,
        following_count: 5,
        created_at: new Date().toISOString(),
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ success: true, data: mockProfile }),
      } as any);

      const result = await fetchPublicUserProfile('11111111-1111-1111-1111-111111111111');
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.profile.id).toBe(mockProfile.id);
        expect(result.profile.follower_count).toBe(12);
        expect(result.profile.following_count).toBe(5);
      }
    });
  });

  describe('Social Client Functions (social.ts)', () => {
    it('uses authenticated owner routes instead of public routes', async () => {
      const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: { items: [], next_cursor: null, has_more: false } } });
      await fetchTravelerList('private-user', 'followers', true);
      expect(get.mock.calls[0][0]).toBe('/users/me/followers');
      await fetchTravelerList('private-user', 'following', true);
      expect(get.mock.calls[1][0]).toBe('/users/me/following');
      await fetchTravelerList('public-user', 'following', false);
      expect(get.mock.calls[2][0]).toBe('/users/public-user/following');
    });
    it('distinguishes expired login from empty connections', async () => {
      vi.spyOn(api, 'get').mockRejectedValue({ response: { status: 401 } });
      await expect(fetchTravelerList('owner', 'followers', true)).rejects.toThrow('sign in again');
    });
    it('fetchPublicTravelers handles error gracefully', async () => {
      const travelers = await fetchPublicTravelers();
      expect(Array.isArray(travelers)).toBe(true);
    });

    it('fetchUserRelationship handles missing user gracefully', async () => {
      const rel = await fetchUserRelationship('unknown-id');
      // In unit test without live server, returns null
      expect(rel === null || typeof rel === 'object').toBe(true);
    });
  });
});
