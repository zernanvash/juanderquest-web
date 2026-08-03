import { describe, expect, it } from 'vitest';
import { adminHandoffUrl, isStoredUser } from './auth';

describe('stored auth session helpers', () => {
  it('rejects non-object stored users', () => {
    expect(isStoredUser(null)).toBe(false);
    expect(isStoredUser('{"role":"user"}')).toBe(false);
    expect(isStoredUser({ role: 'user' })).toBe(true);
  });

  it('hands admin tokens off in an encoded URL fragment', () => {
    expect(adminHandoffUrl('token with + symbols')).toContain('#session=token%20with%20%2B%20symbols');
  });
});
