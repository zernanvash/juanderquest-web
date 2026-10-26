import { api } from '@/lib/api';

export const STAMPS_UPDATED_EVENT = 'jdq:stamps-updated';

export function notifyStampsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAMPS_UPDATED_EVENT));
  }
}

export interface StampCalendarDay {
  day: number;
  stamps: number;
  claimed: boolean;
}

export interface StampMission {
  id: string;
  kind: string;
  title: string;
  stamps: number;
  on_site: boolean;
  progress: number;
  target: number;
  completed: boolean;
  completed_at: string | null;
}

export interface StampClaimState {
  claimed_today: boolean;
  cycle_day: number;
  claimed_days: number;
  nominal_stamps: number;
  awarded: number;
  capped: boolean;
  claimed_at: string | null;
  calendar: StampCalendarDay[];
}

export interface StampStreak {
  current: number;
  best: number;
  last_claim_date: string | null;
  shields_held: number;
  shields_max: number;
  shield_price: number;
}

export interface StampChest {
  completed_missions: number;
  required: number;
  stamps: number;
  earned: boolean;
}

export interface StampWeek {
  used: number;
  cap: number;
  remaining: number;
}

export interface DailyStamps {
  date: string;
  week_id: string;
  next_reset_at: string;
  balance: number;
  week: StampWeek;
  claim: StampClaimState;
  streak: StampStreak;
  chest: StampChest;
  missions?: StampMission[];
  qotd?: { answered: boolean };
  replayed?: boolean;
}

export interface StampHistoryItem {
  id: number;
  delta: number;
  source: string;
  reason: string | null;
  manila_date: string;
  created_at: string;
}

export interface StampHistory {
  balance: number;
  items: StampHistoryItem[];
  next_cursor: number | null;
}

export interface SpendShieldResult {
  item: string;
  price: number;
  balance: number;
  shields_held: number;
  replayed: boolean;
}

export interface QotdOption {
  id: string;
  ordinal: number;
  text: string;
}

export interface QotdQuestion {
  id: string;
  text: string;
  quiz_title: string;
  options: QotdOption[];
}

export interface QotdAnswerState {
  correct: boolean;
  option_id: string;
  explanation: string | null;
  source_url: string | null;
}

export interface QotdResponse {
  date: string;
  question: QotdQuestion | null;
  answered: boolean;
  answer: QotdAnswerState | null;
}

export interface QotdAnswerResult {
  date: string;
  correct: boolean;
  correct_option_id: string | null;
  explanation: string | null;
  source_url: string | null;
}

export async function fetchDailyStamps(): Promise<DailyStamps> {
  const response = await api.get('/me/daily', { timeout: 10000 });
  return response.data.data as DailyStamps;
}

export async function claimDailyStamps(): Promise<DailyStamps> {
  const key = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await api.post('/me/daily/claim', {}, {
    timeout: 12000,
    headers: { 'Idempotency-Key': key },
  });
  return response.data.data as DailyStamps;
}

export async function fetchStampHistory(cursor?: number | null, limit = 20): Promise<StampHistory> {
  const response = await api.get('/me/stamps', {
    params: { ...(cursor ? { cursor } : {}), limit },
    timeout: 10000,
  });
  return response.data.data as StampHistory;
}

export async function fetchStampBalance(): Promise<{ balance: number }> {
  const response = await api.get('/me/stamps', { params: { limit: 1 }, timeout: 8000 });
  return { balance: Number(response.data.data?.balance ?? 0) };
}

export async function spendStreakShield(): Promise<SpendShieldResult> {
  const key = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const response = await api.post('/me/stamps/spend', { item: 'streak_shield' }, {
    timeout: 12000,
    headers: { 'Idempotency-Key': key },
  });
  return response.data.data as SpendShieldResult;
}

export async function fetchQotd(): Promise<QotdResponse> {
  const response = await api.get('/qotd', { timeout: 10000 });
  return response.data.data as QotdResponse;
}

export async function answerQotd(optionId: string): Promise<QotdAnswerResult> {
  const response = await api.post('/qotd/answer', { option_id: optionId }, { timeout: 10000 });
  return response.data.data as QotdAnswerResult;
}

/** Manila-midnight countdown; pure so it can be tested without a browser. */
export function formatStampCountdown(nextResetAt: string, now: number = Date.now()): string {
  const target = new Date(nextResetAt).getTime();
  if (!Number.isFinite(target)) return '--:--';
  const remaining = Math.max(0, target - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function missionIconKind(kind: string): 'qotd' | 'cheer' | 'story' | 'checkin' | 'quest' {
  if (kind === 'qotd') return 'qotd';
  if (kind === 'cheer_post') return 'cheer';
  if (kind === 'read_story') return 'story';
  if (kind === 'check_in') return 'checkin';
  return 'quest';
}

export function stampSourceLabel(source: string, reason: string | null): string {
  if (source === 'daily_claim') return 'Daily check-in';
  if (source === 'weekly_chest') return 'Weekly chest';
  if (source === 'mission') {
    if (reason === 'qotd') return 'Question of the Day';
    if (reason === 'cheer_post') return 'Cheered a Plaza post';
    if (reason === 'read_story') return 'Read a destination story';
    if (reason === 'check_in') return 'Destination check-in';
    if (reason === 'quest_step') return 'Quest step verified';
    return 'Daily mission';
  }
  if (source === 'spend:streak_shield') return 'Streak shield';
  return source.replace(/_/g, ' ');
}
