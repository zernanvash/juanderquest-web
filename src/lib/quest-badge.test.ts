import { describe, expect, it } from 'vitest';
import { questBadgeLabel } from './quest-badge';

describe('questBadgeLabel', () => {
  it('shows the reward points when the quest pays', () => {
    expect(questBadgeLabel({ rewardPoints: 50 })).toBe('Eco-Quest · +50 pts');
  });

  it('formats large rewards with a thousands separator', () => {
    expect(questBadgeLabel({ rewardPoints: 1200 })).toBe('Eco-Quest · +1,200 pts');
  });

  it('keeps the plain label for zero, negative or missing rewards', () => {
    expect(questBadgeLabel({ rewardPoints: 0 })).toBe('Eco-Quest');
    expect(questBadgeLabel({ rewardPoints: -5 })).toBe('Eco-Quest');
    expect(questBadgeLabel({ rewardPoints: Number.NaN })).toBe('Eco-Quest');
    expect(questBadgeLabel({})).toBe('Eco-Quest');
  });
});
