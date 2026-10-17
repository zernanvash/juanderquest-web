import { describe, expect, it } from 'vitest';
import { takeToken, tileClientKey } from './tile-rate-limit';

describe('tile rate limit', () => {
  it('allows the initial 400 requests and denies the 401st', () => {
    const key = `bucket-${crypto.randomUUID()}`;
    for (let i = 0; i < 400; i += 1) expect(takeToken(key, 1_000)).toBe(true);
    expect(takeToken(key, 1_000)).toBe(false);
  });

  it('refills at ten tokens per second', () => {
    const key = `refill-${crypto.randomUUID()}`;
    for (let i = 0; i < 400; i += 1) takeToken(key, 10_000);
    expect(takeToken(key, 10_000)).toBe(false);
    expect(takeToken(key, 10_100)).toBe(true);
  });

  it('prefers Cloudflare client IP, then the first forwarded IP, then local', () => {
    expect(tileClientKey(new Headers({ 'cf-connecting-ip': '203.0.113.1', 'x-forwarded-for': '198.51.100.2' }))).toBe('203.0.113.1');
    expect(tileClientKey(new Headers({ 'x-forwarded-for': '198.51.100.2, 198.51.100.3' }))).toBe('198.51.100.2');
    expect(tileClientKey(new Headers())).toBe('local');
  });
});
