import { describe, expect, it } from 'vitest';
import { appRoutes, isResourceId, safeReturnPath } from './routes';

describe('canonical resource routes', () => {
  it('encodes path segments and uses one route per resource', () => {
    expect(appRoutes.spot('spot-123')).toBe('/spots/spot-123');
    expect(appRoutes.quest('q/123')).toBe('/quests/q%2F123');
    expect(appRoutes.user('user:one')).toBe('/profile/user%3Aone');
    expect(appRoutes.campaign('campaign-1')).toBe('/campaigns/campaign-1');
    expect(appRoutes.choice('round-1')).toBe('/choice/round-1');
    expect(appRoutes.choiceCandidate('round-1', 'candidate-2')).toBe('/choice/round-1/candidates/candidate-2');
  });

  it('rejects invalid resource identifiers', () => {
    expect(isResourceId('spot-hundred-islands')).toBe(true);
    expect(isResourceId('8f4c2a91')).toBe(true);
    for (const value of ['', '../admin', 'one/two', '%2F', '.hidden', 'a'.repeat(181)]) {
      expect(isResourceId(value)).toBe(false);
    }
  });

  it('allows internal login returns but rejects external or ambiguous targets', () => {
    expect(safeReturnPath('/spots/spot-1?ref=test')).toBe('/spots/spot-1?ref=test');
    for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/login/again', '/foo\nbar']) {
      expect(safeReturnPath(value)).toBeNull();
    }
  });
});
