import { describe, it, expect } from 'vitest';
import { isTravelerSession } from './traveler-session';

describe('traveler session gate', () => {
  it('accepts wallet and independently provisioned guest identities', () => {
    expect(isTravelerSession({ seedId: 'wallet:0x123' })).toBe(true);
    expect(isTravelerSession({ seedId: 'guest:server-generated-id' })).toBe(true);
  });
  it('does not treat missing or legacy demo accounts as traveler sessions', () => {
    expect(isTravelerSession(null)).toBe(false);
    expect(isTravelerSession({ seedId: 'admin-1' })).toBe(false);
    expect(isTravelerSession({ seedId: 'user-1' })).toBe(false);
  });
});
