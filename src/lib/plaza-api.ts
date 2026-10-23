import { api } from '@/lib/api';

export type ActivityVerb =
  | 'quest_completed'
  | 'trail_completed'
  | 'town_completed'
  | 'badge_earned'
  | 'level_up'
  | 'streak_milestone'
  | 'rank_top10'
  | 'weekly_champion'
  | 'spot_posted'
  | 'first_photo'
  | 'juanchoice_voted'
  | 'quiz_aced';

export type ActivitySubjectType =
  | 'quest'
  | 'trail'
  | 'town'
  | 'badge'
  | 'level'
  | 'streak'
  | 'rank'
  | 'spot'
  | 'campaign'
  | 'quiz';

export interface ActivityItem {
  id: string;
  verb: ActivityVerb;
  actor: {
    user_id: string;
    display_name: string;
    handle: string;
    avatar_url: string;
    cosmetics?: import('./api').CosmeticRenderData;
    is_following: boolean;
  };
  subject: {
    type: ActivitySubjectType;
    id: string;
    title: string;
    href: string;
  };
  municipality: string | null;
  payload: Record<string, any>;
  reason: 'following' | 'you' | 'nearby';
  cheer_count: number;
  cheered_by_me: boolean;
  comment_count: number;
  can_hide: boolean;
  created_at: string;
}

export interface CommentItem {
  id: string;
  author: {
    user_id?: string;
    display_name: string;
    handle: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  can_delete: boolean;
  can_report: boolean;
  hidden_pending_review?: boolean;
}

export interface StandingEntry {
  rank: number;
  user_id: string | null;
  display_name: string;
  handle: string;
  avatar_url: string;
  cosmetics?: import('./api').CosmeticRenderData;
  score: number;
  quests: number;
  home_town: string | null;
  delta: number | null;
  is_self: boolean;
  is_following: boolean;
}

export interface RivalsGroup {
  above: StandingEntry[];
  below: StandingEntry[];
}

export interface StandingsResponseData {
  board: 'everyone' | 'following' | 'town';
  period: 'weekly' | 'all_time';
  week: {
    id: string;
    starts_at: string;
    ends_at: string;
    resets_in_seconds: number;
  };
  me: StandingEntry | null;
  podium: StandingEntry[];
  entries: StandingEntry[];
  rivals: RivalsGroup;
  town: { name: string } | null;
  total: number;
  next_after_rank: number | null;
  provenance_note?: string;
  degraded?: boolean;
}

export interface TownEntry {
  rank: number;
  town: string;
  score_sum: number;
  active_explorers: number;
  top_explorer: {
    display_name: string;
    handle: string;
    avatar_url: string;
  } | null;
  is_my_town: boolean;
}

export interface TownsResponseData {
  week: {
    id: string;
    starts_at: string;
    ends_at: string;
  };
  towns: TownEntry[];
  degraded?: boolean;
}

export interface FeedResponseData {
  items: ActivityItem[];
  next_cursor: string | null;
  degraded?: boolean;
}

export interface CommentsResponseData {
  items: CommentItem[];
  next_cursor: string | null;
}

export async function getStandings(params: {
  board?: 'everyone' | 'following' | 'town';
  period?: 'weekly' | 'all_time';
  metric?: 'scout_reputation' | 'quests_completed' | 'points';
  limit?: number;
  after_rank?: number;
}): Promise<StandingsResponseData | null> {
  const res = await api.get('/plaza/standings', { params, timeout: 8000 });
  return res.data?.data ?? null;
}

export async function getTowns(): Promise<TownsResponseData | null> {
  const res = await api.get('/plaza/towns', { params: { period: 'weekly' }, timeout: 8000 });
  return res.data?.data ?? null;
}

export async function getFeed(params: {
  scope?: 'mixed' | 'following';
  cursor?: string;
  limit?: number;
}): Promise<FeedResponseData> {
  const res = await api.get('/plaza/feed', { params, timeout: 8000 });
  return res.data?.data ?? { items: [], next_cursor: null };
}

export async function getActivity(id: string): Promise<ActivityItem | null> {
  const res = await api.get(`/plaza/activities/${encodeURIComponent(id)}`, { timeout: 8000 });
  return res.data?.data ?? null;
}

export async function cheerActivity(id: string): Promise<{ cheered: boolean; cheer_count: number }> {
  const res = await api.put(`/plaza/activities/${encodeURIComponent(id)}/cheer`, {}, { timeout: 8000 });
  return res.data?.data ?? { cheered: true, cheer_count: 0 };
}

export async function uncheerActivity(id: string): Promise<{ cheered: boolean; cheer_count: number }> {
  const res = await api.delete(`/plaza/activities/${encodeURIComponent(id)}/cheer`, { timeout: 8000 });
  return res.data?.data ?? { cheered: false, cheer_count: 0 };
}

export async function hideActivity(id: string): Promise<{ hidden: boolean }> {
  const res = await api.delete(`/plaza/activities/${encodeURIComponent(id)}`, { timeout: 8000 });
  return res.data?.data ?? { hidden: true };
}

export async function listComments(activityId: string, params?: { cursor?: string; limit?: number }): Promise<CommentsResponseData> {
  const res = await api.get(`/plaza/activities/${encodeURIComponent(activityId)}/comments`, { params, timeout: 8000 });
  return res.data?.data ?? { items: [], next_cursor: null };
}

export async function addComment(
  activityId: string,
  body: string,
  idempotencyKey: string,
): Promise<CommentItem> {
  const res = await api.post(
    `/plaza/activities/${encodeURIComponent(activityId)}/comments`,
    { body, idempotency_key: idempotencyKey },
    { timeout: 8000 },
  );
  return res.data?.data;
}

export async function deleteComment(id: string): Promise<{ deleted: boolean }> {
  const res = await api.delete(`/plaza/comments/${encodeURIComponent(id)}`, { timeout: 8000 });
  return res.data?.data ?? { deleted: true };
}

export async function reportComment(
  id: string,
  reason: string,
  note?: string,
): Promise<{ reported: boolean }> {
  const res = await api.post(
    `/plaza/comments/${encodeURIComponent(id)}/report`,
    { reason, note },
    { timeout: 8000 },
  );
  return res.data?.data ?? { reported: true };
}

export async function followUser(userId: string): Promise<{ success: boolean; follower_count?: number }> {
  const res = await api.put(`/users/${encodeURIComponent(userId)}/follow`, {}, { timeout: 8000 });
  return res.data;
}

export async function unfollowUser(userId: string): Promise<{ success: boolean }> {
  const res = await api.delete(`/users/${encodeURIComponent(userId)}/follow`, { timeout: 8000 });
  return res.data;
}
