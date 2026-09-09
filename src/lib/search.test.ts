import { describe, it, expect } from 'vitest';
import { normalizeSearchQuery, isProcessableQuery } from './search';

describe('Search Query Normalizer and Gate (web_app/src/lib/search.ts)', () => {
  it('normalizes Unicode NFKC and collapses multiple whitespaces', () => {
    expect(normalizeSearchQuery('   Hundred    Islands   ')).toBe('Hundred Islands');
    expect(normalizeSearchQuery('Caf\u0065\u0301')).toBe('Café');
  });

  it('rejects empty, whitespace, and single character queries', () => {
    expect(isProcessableQuery('')).toBe(false);
    expect(isProcessableQuery('   ')).toBe(false);
    expect(isProcessableQuery('a')).toBe(false);
    expect(isProcessableQuery(' 1 ')).toBe(false);
  });

  it('rejects punctuation, emoji-only, and bare symbol queries', () => {
    expect(isProcessableQuery('@@')).toBe(false);
    expect(isProcessableQuery('---')).toBe(false);
    expect(isProcessableQuery('🏖️🌊')).toBe(false);
    expect(isProcessableQuery('@j')).toBe(false); // Only 1 alphanumeric letter
  });

  it('accepts queries with 2 or more alphanumeric characters', () => {
    expect(isProcessableQuery('bo')).toBe(true);
    expect(isProcessableQuery('@ju')).toBe(true);
    expect(isProcessableQuery('100')).toBe(true);
    expect(isProcessableQuery('Bolinao Lighthouse')).toBe(true);
  });

  it('rejects queries exceeding 100 characters', () => {
    expect(isProcessableQuery('a'.repeat(101))).toBe(false);
  });

  it('fetchSearchPreview rejects invalid queries before network dispatch', async () => {
    const { fetchSearchPreview } = await import('./search');
    await expect(fetchSearchPreview('')).rejects.toThrow('Query does not meet minimum processable criteria');
    await expect(fetchSearchPreview('!@#')).rejects.toThrow('Query does not meet minimum processable criteria');
  });

  it('fetchSearchResults rejects invalid queries before network dispatch', async () => {
    const { fetchSearchResults } = await import('./search');
    await expect(fetchSearchResults('a')).rejects.toThrow('Query does not meet minimum processable criteria');
  });
});
