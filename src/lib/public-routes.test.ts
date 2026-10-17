import { describe, expect, it } from 'vitest';
import { isPublicPage } from './public-routes';

describe('isPublicPage', () => {
  it('marks core browse, discovery, and legal routes as public', () => {
    expect(isPublicPage('/')).toBe(true);
    expect(isPublicPage('/explore')).toBe(true);
    expect(isPublicPage('/map')).toBe(true);
    expect(isPublicPage('/quests')).toBe(true);
    expect(isPublicPage('/plaza')).toBe(true);
    expect(isPublicPage('/leaderboard')).toBe(true);
    expect(isPublicPage('/choice')).toBe(true);
    expect(isPublicPage('/trail')).toBe(true);
    expect(isPublicPage('/about')).toBe(true);
    expect(isPublicPage('/search')).toBe(true);
    expect(isPublicPage('/login')).toBe(true);
    expect(isPublicPage('/download')).toBe(true);
    expect(isPublicPage('/affiliate')).toBe(true);
    expect(isPublicPage('/privacy')).toBe(true);
    expect(isPublicPage('/terms')).toBe(true);
    expect(isPublicPage('/thank-you')).toBe(true);
  });

  it('marks destination detail, quest overview, and public traveler profiles as public', () => {
    expect(isPublicPage('/spots/hundred-islands-national-park')).toBe(true);
    expect(isPublicPage('/spots/patar-white-beach')).toBe(true);
    expect(isPublicPage('/quests/hundred-islands-clean-shore-quest')).toBe(true);
    expect(isPublicPage('/users/explorer-ana')).toBe(true);
    expect(isPublicPage('/profile/explorer-ana')).toBe(true);
  });

  it('keeps creation, active quest play, self profile, and account routes protected', () => {
    expect(isPublicPage('/quests/create')).toBe(false);
    expect(isPublicPage('/quests/hundred-islands-clean-shore-quest/play')).toBe(false);
    expect(isPublicPage('/profile')).toBe(false);
    expect(isPublicPage('/settings')).toBe(false);
    expect(isPublicPage('/shop')).toBe(false);
    expect(isPublicPage('/creator')).toBe(false);
    expect(isPublicPage('/economy-lab')).toBe(false);
    expect(isPublicPage(null)).toBe(false);
    expect(isPublicPage(undefined)).toBe(false);
  });
});
