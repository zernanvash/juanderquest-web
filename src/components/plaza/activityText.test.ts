import { describe, it, expect } from 'vitest';
import { formatActivityText } from './activityText';
import type { ActivityItem } from '@/lib/plaza-api';

describe('formatActivityText', () => {
  const baseItem: ActivityItem = {
    id: 'act_1',
    verb: 'quest_completed',
    actor: {
      user_id: 'u_1',
      display_name: 'Aira',
      handle: 'aira_coast',
      avatar_url: '',
      is_following: true,
    },
    subject: {
      type: 'quest',
      id: 'q_1',
      title: 'Hundred Islands Expedition',
      href: '/quests/q_1',
    },
    municipality: 'Alaminos City',
    payload: { points: 100 },
    reason: 'following',
    cheer_count: 12,
    cheered_by_me: false,
    comment_count: 3,
    can_hide: false,
    created_at: '2026-10-17T03:12:00.000Z',
  };

  it('formats quest_completed with points', () => {
    const res = formatActivityText(baseItem);
    expect(res.sentence).toBe('Aira completed Hundred Islands Expedition');
    expect(res.pointsBadge).toBe('+100 pts');
  });

  it('formats trail_completed', () => {
    const res = formatActivityText({
      ...baseItem,
      verb: 'trail_completed',
      subject: { ...baseItem.subject, type: 'trail', title: 'Western Coastal' },
    });
    expect(res.sentence).toBe('Aira finished the Western Coastal trail');
  });

  it('formats town_completed', () => {
    const res = formatActivityText({
      ...baseItem,
      verb: 'town_completed',
      subject: { ...baseItem.subject, type: 'town', title: 'Alaminos City' },
    });
    expect(res.sentence).toBe('Aira completed every Eco-Quest in Alaminos City 🎉');
  });

  it('formats badge_earned', () => {
    const res = formatActivityText({
      ...baseItem,
      verb: 'badge_earned',
      subject: { ...baseItem.subject, type: 'badge', title: 'Island Hopper' },
      payload: { icon: '🏝️' },
    });
    expect(res.sentence).toBe('Aira earned the Island Hopper badge 🏝️');
  });

  it('formats rank_top10', () => {
    const res = formatActivityText({
      ...baseItem,
      verb: 'rank_top10',
      payload: { rank: 4 },
    });
    expect(res.sentence).toBe("Aira entered this week's top 10 (#4)");
  });

  it('formats weekly_champion (place 1 vs place 2)', () => {
    const p1 = formatActivityText({
      ...baseItem,
      verb: 'weekly_champion',
      payload: { place: 1, week_id: '2026-W41' },
    });
    expect(p1.sentence).toBe('Aira is the Weekly Champion of 2026-W41 🏆');

    const p2 = formatActivityText({
      ...baseItem,
      verb: 'weekly_champion',
      payload: { place: 2, week_id: '2026-W41' },
    });
    expect(p2.sentence).toBe('Aira finished #2 in 2026-W41');
  });

  it('formats quiz_aced', () => {
    const res = formatActivityText({
      ...baseItem,
      verb: 'quiz_aced',
      subject: { ...baseItem.subject, type: 'quiz', title: 'Pangasinan History' },
      payload: { score: 5, max_score: 5 },
    });
    expect(res.sentence).toBe('Aira aced the Pangasinan History quiz (5/5)');
  });
});
