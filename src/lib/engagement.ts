import { api } from './api';

export interface EngagementChallenge {
  id: string;
  title: string;
  progress: number;
  target: number;
  complete: boolean;
}

export interface EngagementSummary {
  streak: { current: number; longest: number; next_milestone: number | null; rounds_observed: number };
  impact: { verified_visits: number; unique_destinations: number; municipalities: number; finalized_participations: number };
  challenges: EngagementChallenge[];
  share_achievements: boolean;
}

export async function fetchMyEngagement(): Promise<EngagementSummary> {
  const response = await api.get('/me/engagement', { timeout: 8000 });
  return response.data.data as EngagementSummary;
}

export async function updateAchievementSharing(enabled: boolean): Promise<void> {
  await api.put('/me/engagement/preferences', { share_achievements: enabled }, { timeout: 8000 });
}
