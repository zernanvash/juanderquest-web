import { describe, it, expect } from 'vitest';
import { isTravelerSession } from './traveler-session';

describe('traveler session gate', () => {
  it('accepts wallet and independently provisioned guest identities', () => {
    expect(isTravelerSession({ seedId: 'wallet:0x123' })).toBe(true);
    expect(isTravelerSession({ seedId: 'guest:server-generated-id' })).toBe(true);
  });
  it('accepts ordinary email/Google traveler accounts but not admin identities', () => {
    expect(isTravelerSession({ seedId: 'usr-123456', role: 'user' })).toBe(true);
    expect(isTravelerSession({ seedId: 'usr-admin123', role: 'admin' })).toBe(false);
    expect(isTravelerSession({ seedId: 'usr-verified-email', role: 'user' })).toBe(true);
    expect(isTravelerSession({ seedId: 'admin-1', role: 'admin' }, true)).toBe(true);
  });
  it('keeps wallet admins in the traveler app without the app view', () => {
    expect(isTravelerSession({ seedId: 'wallet:0xadmin', role: 'admin' })).toBe(true);
    expect(isTravelerSession({ seedId: 'usr-admin123', role: 'admin' })).toBe(false);
  });
  it('does not treat missing or legacy demo accounts as traveler sessions', () => {
    expect(isTravelerSession(null)).toBe(false);
    expect(isTravelerSession({ seedId: 'admin-1', role: 'admin' })).toBe(false);
    expect(isTravelerSession({ seedId: 'qa-1', role: 'qa' })).toBe(false);
    expect(isTravelerSession({ seedId: 'user-1' })).toBe(false);
  });
});
