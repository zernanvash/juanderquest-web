import { describe, expect, it } from 'vitest';
import { communityChoicePreview, publicTravelerProfiles } from './community';
import { normalizeSavedLibrary, toggleSavedSnapshot } from './saved-library';

describe('community discovery UI contracts', () => {
  it('normalizes malformed saved-library storage safely', () => {
    expect(normalizeSavedLibrary({ spots: ['s1', 4], quests: 'bad' })).toEqual({ spots: ['s1'], quests: [] });
    expect(normalizeSavedLibrary(null)).toEqual({ spots: [], quests: [] });
  });

  it('toggles saved IDs without changing the other collection', () => {
    const added = toggleSavedSnapshot({ spots: [], quests: ['q1'] }, 'spots', 's1');
    expect(added).toEqual({ spots: ['s1'], quests: ['q1'] });
    expect(toggleSavedSnapshot(added, 'spots', 's1')).toEqual({ spots: [], quests: ['q1'] });
  });

  it('keeps public profile handles and IDs unique', () => {
    expect(new Set(publicTravelerProfiles.map(({ id }) => id)).size).toBe(publicTravelerProfiles.length);
    expect(new Set(publicTravelerProfiles.map(({ handle }) => handle)).size).toBe(publicTravelerProfiles.length);
  });

  it('uses a complete percentage distribution for the leaderboard preview', () => {
    expect(communityChoicePreview.entries.reduce((sum, entry) => sum + entry.share, 0)).toBe(100);
  });
});
