import { describe, expect, it } from 'vitest';
import { formatStampCountdown, missionIconKind, stampSourceLabel } from './stamps-api';

describe('stamps presentation helpers', () => {
  it('formats the Manila countdown with hours and pads minutes/seconds', () => {
    const now = new Date('2026-10-26T12:00:00Z').getTime();
    expect(formatStampCountdown('2026-10-26T16:00:00.000Z', now)).toBe('4h 00m 00s');
    expect(formatStampCountdown('2026-10-26T12:05:09.000Z', now)).toBe('05m 09s');
    expect(formatStampCountdown('2026-10-26T11:00:00.000Z', now)).toBe('00m 00s');
    expect(formatStampCountdown('not-a-date', now)).toBe('--:--');
  });

  it('labels every stamp source without leaking internal identifiers', () => {
    expect(stampSourceLabel('daily_claim', 'daily_claim')).toBe('Daily check-in');
    expect(stampSourceLabel('weekly_chest', 'weekly_chest')).toBe('Weekly chest');
    expect(stampSourceLabel('mission', 'cheer_post')).toBe('Cheered a Plaza post');
    expect(stampSourceLabel('mission', 'quest_step')).toBe('Quest step verified');
    expect(stampSourceLabel('spend:streak_shield', 'streak_shield')).toBe('Streak shield');
  });

  it('maps mission kinds to presentation icons', () => {
    expect(missionIconKind('qotd')).toBe('qotd');
    expect(missionIconKind('cheer_post')).toBe('cheer');
    expect(missionIconKind('read_story')).toBe('story');
    expect(missionIconKind('check_in')).toBe('checkin');
    expect(missionIconKind('quest_step')).toBe('quest');
  });
});
