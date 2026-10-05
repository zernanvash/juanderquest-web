import { describe, expect, it } from 'vitest';
import { isPublicPage } from './public-routes';

describe('wallet gate public pages', () => {
  it('lets anyone view the informational Trail preview', () => {
    expect(isPublicPage('/trail')).toBe(true);
  });

  it('continues to protect functional app routes', () => {
    expect(isPublicPage('/explore')).toBe(false);
    expect(isPublicPage('/quests')).toBe(false);
    expect(isPublicPage('/profile')).toBe(false);
  });
});
