import { describe, expect, it } from 'vitest';
import { validatePresentationWebEnv } from './presentation-web-config';

describe('Presentation Web Config & Boundary Validation', () => {
  const validPresentationEnv = {
    NEXT_DIST_DIR: '.next-presentation',
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3200',
    NEXT_PUBLIC_API_BASE_URL: '/api/v1',
    API_PROXY_TARGET: 'http://127.0.0.1:4200',
    PORT: '3200',
    HOST: '127.0.0.1',
  };

  it('accepts valid presentation configuration', () => {
    const config = validatePresentationWebEnv(validPresentationEnv);
    expect(config.distDir).toBe('.next-presentation');
    expect(config.port).toBe(3200);
    expect(config.apiProxyTarget).toBe('http://127.0.0.1:4200');
    expect(config.siteUrl).toBe('http://127.0.0.1:3200');
    expect(config.host).toBe('127.0.0.1');
  });

  it('rejects distDir if set to default .next in presentation mode', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, NEXT_DIST_DIR: '.next' })
    ).toThrow(/requires NEXT_DIST_DIR=".next-presentation"/);
  });

  it('rejects API proxy targeting port 4000 (alpha API)', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, API_PROXY_TARGET: 'http://127.0.0.1:4000' })
    ).toThrow(/must be http:\/\/127\.0\.0\.1:4200/);
  });

  it('rejects API proxy targeting public api.juanderquest.app', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, API_PROXY_TARGET: 'https://api.juanderquest.app' })
    ).toThrow(/must be http:\/\/127\.0\.0\.1:4200/);
  });

  it('rejects web port 3000 (alpha web port collision)', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, PORT: '3000' })
    ).toThrow(/Presentation web port must be 3200/);
  });

  it('rejects ordinary alpha site URL in local profile', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, NEXT_PUBLIC_SITE_URL: 'https://juanderquest.app' })
    ).toThrow(/Presentation web cannot use ordinary alpha origins/);
  });

  it('rejects non-matching local site URL', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:8000' })
    ).toThrow(/requires NEXT_PUBLIC_SITE_URL=http:\/\/127\.0\.0\.1:3200/);
  });

  it('accepts valid public presentation profile configuration', () => {
    const config = validatePresentationWebEnv({
      ...validPresentationEnv,
      JDQ_PRESENTATION_PROFILE: 'public',
      NEXT_PUBLIC_SITE_URL: 'https://presentation.juanderquest.app',
    });
    expect(config.profile).toBe('public');
    expect(config.siteUrl).toBe('https://presentation.juanderquest.app');
    expect(config.apiProxyTarget).toBe('http://127.0.0.1:4200');
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3200);
  });

  it('rejects ordinary alpha site URL in public profile', () => {
    expect(() =>
      validatePresentationWebEnv({
        ...validPresentationEnv,
        JDQ_PRESENTATION_PROFILE: 'public',
        NEXT_PUBLIC_SITE_URL: 'https://juanderquest.app',
      })
    ).toThrow(/Presentation web cannot use ordinary alpha origins/);
  });

  it('rejects loopback site URL when profile is public', () => {
    expect(() =>
      validatePresentationWebEnv({
        ...validPresentationEnv,
        JDQ_PRESENTATION_PROFILE: 'public',
        NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3200',
      })
    ).toThrow(/requires NEXT_PUBLIC_SITE_URL=https:\/\/presentation\.juanderquest\.app/);
  });

  it('rejects invalid JDQ_PRESENTATION_PROFILE value', () => {
    expect(() =>
      validatePresentationWebEnv({
        ...validPresentationEnv,
        JDQ_PRESENTATION_PROFILE: 'staging',
      })
    ).toThrow(/Invalid JDQ_PRESENTATION_PROFILE: "staging"/);
  });

  it('rejects credentialed proxy URLs even when the host and port match', () => {
    expect(() => validatePresentationWebEnv({
      ...validPresentationEnv,
      API_PROXY_TARGET: 'http://user:password@127.0.0.1:4200',
    })).toThrow(/must be http:\/\/127\.0\.0\.1:4200/);
  });

  it('rejects a proxy path that would bypass the intended API origin', () => {
    expect(() => validatePresentationWebEnv({
      ...validPresentationEnv,
      API_PROXY_TARGET: 'http://127.0.0.1:4200/other',
    })).toThrow(/must be http:\/\/127\.0\.0\.1:4200/);
  });

  it('rejects non-loopback host', () => {
    expect(() =>
      validatePresentationWebEnv({ ...validPresentationEnv, HOST: '0.0.0.0' })
    ).toThrow(/host must be 127.0.0.1/);
  });
});
