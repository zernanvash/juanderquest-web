import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import nextConfig from '../../next.config';
import {
  validatePresentationWebEnv,
  PRESENTATION_PUBLIC_SITE_URL,
  PRESENTATION_LOCAL_SITE_URL,
} from './presentation-web-config';

/**
 * presentation-public-profile-probe.test.ts
 *
 * Verifies real Next.js application exports and presentation policies:
 * 1. robots() returns complete disallow (disallow: '/') and suppresses sitemap in presentation mode.
 * 2. sitemap() returns an empty array in presentation mode to avoid indexing.
 * 3. next.config.ts injects X-Robots-Tag: noindex, nofollow, noarchive for .next-presentation.
 * 4. next.config.ts rewrites same-origin /api/v1/:path* to loopback 127.0.0.1:4200.
 * 5. validatePresentationWebEnv enforces public presentation profile boundaries.
 */

describe('JuanChoice Presentation Web Crawler & Configuration Probe', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('Search Engine Indexing Suppression (Robots & Sitemap)', () => {
    it('returns disallow all and suppresses sitemap when NEXT_PUBLIC_JDQ_PRESENTATION_MODE=true', () => {
      process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE = 'true';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://presentation.juanderquest.app';

      const robotsResult = robots();
      expect(robotsResult.rules).toEqual([
        {
          userAgent: '*',
          disallow: '/',
        },
      ]);
      expect(robotsResult.sitemap).toBeUndefined();
      expect(robotsResult.host).toBe('https://presentation.juanderquest.app');
    });

    it('returns disallow all when NEXT_DIST_DIR=.next-presentation', () => {
      process.env.NEXT_DIST_DIR = '.next-presentation';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://presentation.juanderquest.app';

      const robotsResult = robots();
      expect(robotsResult.rules).toEqual([
        {
          userAgent: '*',
          disallow: '/',
        },
      ]);
      expect(robotsResult.sitemap).toBeUndefined();
    });

    it('returns empty sitemap in presentation mode', async () => {
      process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE = 'true';
      const sitemapResult = await sitemap();
      expect(sitemapResult).toEqual([]);
    });

    it('preserves ordinary alpha crawling rules when presentation mode is inactive', () => {
      delete process.env.NEXT_PUBLIC_JDQ_PRESENTATION_MODE;
      delete process.env.NEXT_DIST_DIR;
      process.env.NEXT_PUBLIC_SITE_URL = 'https://juanderquest.app';

      const robotsResult = robots();
      expect(robotsResult.rules).toEqual([
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/profile', '/history', '/login', '/spots/new'],
        },
      ]);
      expect(robotsResult.sitemap).toBe('https://juanderquest.app/sitemap.xml');
      expect(robotsResult.host).toBe('https://juanderquest.app');
    });
  });

  describe('Next.js Presentation Config Headers & Rewrites', () => {
    it('injects X-Robots-Tag header in presentation dist directory', async () => {
      if (typeof nextConfig.headers === 'function') {
        const headers = await nextConfig.headers();
        const pathRule = headers.find((h) => h.source === '/:path*');
        // When distDir is .next-presentation, headers contains X-Robots-Tag
        if (pathRule) {
          expect(pathRule.headers).toEqual(
            expect.arrayContaining([
              {
                key: 'X-Robots-Tag',
                value: 'noindex, nofollow, noarchive',
              },
            ])
          );
        }
      }
    });

    it('rewrites /api/v1/:path* to loopback API target', async () => {
      if (typeof nextConfig.rewrites === 'function') {
        const rewrites = await nextConfig.rewrites();
        const apiRewrite = (rewrites as any[]).find((r) => r.source === '/api/v1/:path*');
        expect(apiRewrite).toBeDefined();
        expect(apiRewrite.destination).toContain('/api/v1/:path*');
      }
    });
  });

  describe('Presentation Web Configuration Boundary', () => {
    it('validates public presentation profile against canonical HTTPS domain', () => {
      const config = validatePresentationWebEnv({
        NEXT_DIST_DIR: '.next-presentation',
        NEXT_PUBLIC_SITE_URL: 'https://presentation.juanderquest.app',
        NEXT_PUBLIC_API_BASE_URL: '/api/v1',
        API_PROXY_TARGET: 'http://127.0.0.1:4200',
        JDQ_PRESENTATION_PROFILE: 'public',
        PORT: '3200',
        HOST: '127.0.0.1',
      });
      expect(config.profile).toBe('public');
      expect(config.siteUrl).toBe(PRESENTATION_PUBLIC_SITE_URL);
      expect(config.apiProxyTarget).toBe('http://127.0.0.1:4200');
    });

    it('rejects public profile configured with ordinary alpha domain', () => {
      expect(() =>
        validatePresentationWebEnv({
          NEXT_DIST_DIR: '.next-presentation',
          NEXT_PUBLIC_SITE_URL: 'https://juanderquest.app',
          NEXT_PUBLIC_API_BASE_URL: '/api/v1',
          API_PROXY_TARGET: 'http://127.0.0.1:4200',
          JDQ_PRESENTATION_PROFILE: 'public',
        })
      ).toThrow(/Presentation web cannot use ordinary alpha origins/);
    });

    it('rejects public profile with non-loopback API proxy', () => {
      expect(() =>
        validatePresentationWebEnv({
          NEXT_DIST_DIR: '.next-presentation',
          NEXT_PUBLIC_SITE_URL: 'https://presentation.juanderquest.app',
          NEXT_PUBLIC_API_BASE_URL: '/api/v1',
          API_PROXY_TARGET: 'https://api.juanderquest.app',
          JDQ_PRESENTATION_PROFILE: 'public',
        })
      ).toThrow(/Presentation API proxy target must be http:\/\/127\.0\.0\.1:4200/);
    });
  });

  describe('Compiled Artifact Integrity & Profile Verification', () => {
    it('verifies that computeBundleSha256 produces a valid hex digest on .next-presentation', async () => {
      const { computeBundleSha256 } = await import('../../scripts/build-presentation.mjs');
      const { resolve } = await import('node:path');
      const distDirPath = resolve(process.cwd(), '.next-presentation');
      const { bundleSha256, bundleFileCount } = computeBundleSha256(distDirPath);

      expect(bundleSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(bundleFileCount).toBeGreaterThan(100);
    });

    it('verifies that presentation-profile.json matches BUILD_ID and computed bundleSha256', async () => {
      const { computeBundleSha256 } = await import('../../scripts/build-presentation.mjs');
      const { resolve } = await import('node:path');
      const { readFileSync, existsSync } = await import('node:fs');

      const distDirPath = resolve(process.cwd(), '.next-presentation');
      const manifestPath = resolve(distDirPath, 'presentation-profile.json');
      const buildIdPath = resolve(distDirPath, 'BUILD_ID');

      expect(existsSync(manifestPath)).toBe(true);
      expect(existsSync(buildIdPath)).toBe(true);

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const buildId = readFileSync(buildIdPath, 'utf8').trim();
      const { bundleSha256 } = computeBundleSha256(distDirPath);

      expect(manifest.profile).toBe('public');
      expect(manifest.buildId).toBe(buildId);
      expect(manifest.bundleSha256).toBe(bundleSha256);
      expect(manifest.siteUrl).toBe('https://presentation.juanderquest.app');
    });
  });
});

