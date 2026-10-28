import { describe, expect, it } from 'vitest';
import { categoryLabel } from './category-label';

describe('categoryLabel', () => {
  it('maps known category ids to plain labels', () => {
    expect(categoryLabel('nature_outdoors')).toBe('Nature');
    expect(categoryLabel('eat_drink')).toBe('Food & drink');
  });

  it('humanizes unknown ids and handles empty values', () => {
    expect(categoryLabel('eco_tour')).toBe('Eco tour');
    expect(categoryLabel(null)).toBe('Destination');
  });
});
