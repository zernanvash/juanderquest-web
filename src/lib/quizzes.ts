import { api } from './api';

export interface NearbyQuizInvitation {
  quiz_id: string;
  destination_id: string;
  destination_name: string;
  municipality: string;
  title: string;
  description: string;
  radius_meters: number;
  distance_meters?: number;
  xp_reward: number;
  time_limit_minutes: number;
  language?: string;
  is_completed?: boolean;
}

export interface QuizOption {
  id: string;
  ordinal: number;
  option_text: string;
}

export interface QuizQuestion {
  id: string;
  ordinal: number;
  question_text: string;
  options: QuizOption[];
  explanation?: string;
  source_url?: string;
  question_type?: 'multiple_choice' | 'true_false' | 'picture' | 'order' | 'map_drop';
  media_url?: string | null;
  round?: 'main' | 'special' | 'lightning';
}

export interface QuizDetail {
  id: string;
  destination_id: string;
  destination_name: string;
  municipality: string;
  gps_lat: number;
  gps_lng: number;
  title: string;
  description: string;
  language: string;
  radius_meters: number;
  xp_reward: number;
  time_limit_minutes: number;
  cooldown_hours: number;
  status: string;
  version: number;
  theme?: string;
  host_lines?: Record<string, unknown>;
  is_completed: boolean;
  active_attempt_id: string | null;
  cooldown_until: string | null;
}

export interface QuizAttemptStartResult {
  attempt: {
    id: string;
    quiz_id: string;
    version_id: string;
    status: string;
    started_at: string;
    expires_at: string;
    lifelines_used?: string[];
    style_score?: number;
    streak_max?: number;
  };
  questions: QuizQuestion[];
}

export interface QuizSubmissionResult {
  passed: boolean;
  score: number;
  total_questions: number;
  xp_awarded: number;
  already_completed_prior: boolean;
  cooldown_until?: string | null;
  breakdown: Array<{
    question_id: string;
    question_text: string;
    selected_option_id: string;
    correct_option_id: string;
    is_correct: boolean;
    explanation: string;
    source_url?: string;
  }>;
}

export interface UserQuizHistoryItem {
  id: string;
  quiz_id: string;
  destination_name: string;
  quiz_title: string;
  status: 'passed' | 'failed' | 'in_progress' | 'expired';
  score: number;
  xp_awarded: number;
  started_at: string;
  completed_at?: string;
}

/**
 * Fetch quizzes nearby given coordinates.
 */
export async function fetchNearbyQuizzes(lat: number, lng: number): Promise<NearbyQuizInvitation[]> {
  try {
    const res = await api.post('/quizzes/nearby', { lat, lng }, { timeout: 6000 });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch detail for a specific quiz by ID.
 */
export async function fetchQuizDetail(quizId: string): Promise<QuizDetail | null> {
  try {
    const res = await api.get(`/quizzes/${encodeURIComponent(quizId)}`, { timeout: 6000 });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Start an attempt for a quiz with geolocation.
 */
export async function startQuizAttempt(params: {
  quizId: string;
  lat: number;
  lng: number;
}): Promise<QuizAttemptStartResult> {
  const res = await api.post(`/quizzes/${encodeURIComponent(params.quizId)}/attempts`, {
    lat: params.lat,
    lng: params.lng,
    captured_at: new Date().toISOString(),
  });
  if (!res.data?.success) {
    throw new Error(res.data?.error?.message || 'Failed to start quiz attempt.');
  }
  return res.data.data;
}

/**
 * Use a single-use lifeline during an active quiz attempt.
 */
export async function consumeQuizLifeline(params: {
  quizId: string;
  attemptId: string;
  lifeline: 'fifty_fifty' | 'ask_local' | 'skip';
  questionId?: string;
}): Promise<{
  lifeline: string;
  question_id?: string;
  eliminated_option_ids?: string[];
  hint?: string;
  skipped?: boolean;
  remaining_lifelines: string[];
}> {
  const res = await api.post(
    `/quizzes/${encodeURIComponent(params.quizId)}/attempts/${encodeURIComponent(params.attemptId)}/lifeline`,
    {
      lifeline: params.lifeline,
      question_id: params.questionId,
    }
  );
  if (!res.data?.success) {
    throw new Error(res.data?.error?.message || 'Failed to use lifeline.');
  }
  return res.data.data;
}

/**
 * Submit answers for an active quiz attempt.
 */
export async function submitQuizAttempt(
  attemptId: string,
  answers: Array<{
    question_id: string;
    selected_option_id?: string;
    selected_order?: string[];
    selected_location?: { lat: number; lng: number };
    skipped?: boolean;
  }>,
  options?: { style_score?: number; streak_max?: number }
): Promise<QuizSubmissionResult> {
  const res = await api.put(`/quiz-attempts/${encodeURIComponent(attemptId)}/submission`, {
    answers,
    style_score: options?.style_score,
    streak_max: options?.streak_max,
  });
  if (!res.data?.success) {
    throw new Error(res.data?.error?.message || 'Failed to submit quiz attempt.');
  }
  return res.data.data;
}

/**
 * Fetch user's past quiz history and rewards.
 */
export async function fetchMyQuizHistory(): Promise<UserQuizHistoryItem[]> {
  try {
    const res = await api.get('/me/quiz-history', { timeout: 6000 });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch {
    return [];
  }
}
