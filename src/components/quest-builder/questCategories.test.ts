import { describe, expect, it } from 'vitest';
import { QUEST_CATEGORIES, questCategoryOrDefault } from './types';

describe('quest builder categories', () => {
  it('offers exactly the categories the API accepts', () => {
    // Must match createAuthorQuestSchema in backend routes/spots.ts; a mismatch fails every publish.
    expect(QUEST_CATEGORIES.map((c) => c.value)).toEqual(['eco', 'cultural', 'food_trade']);
  });

  it('falls back to eco for an unknown or legacy category', () => {
    expect(questCategoryOrDefault('cultural')).toBe('cultural');
    expect(questCategoryOrDefault('eco_tourism')).toBe('eco');
    expect(questCategoryOrDefault(undefined)).toBe('eco');
  });
});
