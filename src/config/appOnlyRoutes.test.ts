import { describe, expect, it } from 'vitest';
import { appOnlyFeatureFor, appOnlyLabel, appOnlyRedirects } from './appOnlyRoutes';

describe('app-only routes (web front door)', () => {
  it('keeps the front-door pages and merchant pages on the web', () => {
    for (const path of [
      '/',
      '/download',
      '/explore',
      '/spots/hundred-islands',
      '/map',
      '/login',
      '/about',
      '/privacy',
      '/terms',
      '/merchant',
      '/merchant/funding',
    ]) {
      expect(appOnlyFeatureFor(path), path).toBeNull();
    }
  });

  it('sends app features to the download page, including nested pages', () => {
    expect(appOnlyFeatureFor('/quests')).toBe('quests');
    expect(appOnlyFeatureFor('/quests/q-1/edit')).toBe('quests');
    expect(appOnlyFeatureFor('/choice/c-1/candidates/x')).toBe('choice');
    expect(appOnlyFeatureFor('/map/add-spot')).toBe('contribute');
    expect(appOnlyFeatureFor('/spots/hundred-islands/quests/new')).toBe('contribute');
    expect(appOnlyFeatureFor('/settings/wallet')).toBe('settings');
    expect(appOnlyFeatureFor('/questsx')).toBeNull();
  });

  it('only names features it knows', () => {
    expect(appOnlyLabel('quests')).toBe('Quests');
    expect(appOnlyLabel('<script>')).toBeNull();
    expect(appOnlyLabel('toString')).toBeNull();
    expect(appOnlyLabel(null)).toBeNull();
  });

  it('builds temporary redirects to /download with the feature key', () => {
    const redirects = appOnlyRedirects();
    expect(redirects).toContainEqual({ source: '/quests/:path*', destination: '/download?feature=quests', permanent: false });
    expect(redirects).toContainEqual({
      source: '/spots/:slug/quests/new',
      destination: '/download?feature=contribute',
      permanent: false,
    });
    expect(redirects.every((r) => r.permanent === false)).toBe(true);
    expect(redirects.some((r) => r.source.startsWith('/merchant') || r.source.startsWith('/explore'))).toBe(false);
  });
});
