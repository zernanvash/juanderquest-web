/**
 * Validation rules and utilities for presentation web environment variables.
 */

export type PresentationWebProfile = 'local' | 'public';

export const PRESENTATION_LOCAL_SITE_URL = 'http://127.0.0.1:3200';
export const PRESENTATION_PUBLIC_SITE_URL = 'https://presentation.juanderquest.app';
export const PRESENTATION_API_PROXY_TARGET = 'http://127.0.0.1:4200';

export interface PresentationWebConfig {
  profile: PresentationWebProfile;
  siteUrl: string;
  apiBaseUrl: string;
  apiProxyTarget: string;
  distDir: string;
  port: number;
  host: string;
}

export function validatePresentationWebEnv(env: Record<string, string | undefined>): PresentationWebConfig {
  const distDir = env.NEXT_DIST_DIR?.trim() || '.next';
  if (distDir !== '.next-presentation') {
    throw new Error(`Presentation web mode requires NEXT_DIST_DIR=".next-presentation", got "${distDir}".`);
  }

  const profile: PresentationWebProfile = (env.JDQ_PRESENTATION_PROFILE?.trim() as PresentationWebProfile) || 'local';
  if (profile !== 'local' && profile !== 'public') {
    throw new Error(`Invalid JDQ_PRESENTATION_PROFILE: "${profile}". Must be "local" or "public".`);
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required for presentation web.');
  }
  let parsedSiteUrl: URL;
  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SITE_URL: "${siteUrl}".`);
  }

  if (parsedSiteUrl.origin === 'https://juanderquest.app' || parsedSiteUrl.origin === 'https://api.juanderquest.app') {
    throw new Error('Presentation web cannot use ordinary alpha origins.');
  }

  const expectedSiteUrl = profile === 'public'
    ? PRESENTATION_PUBLIC_SITE_URL
    : PRESENTATION_LOCAL_SITE_URL;

  if (parsedSiteUrl.origin !== new URL(expectedSiteUrl).origin || (parsedSiteUrl.pathname !== '/' && parsedSiteUrl.pathname !== '')) {
    throw new Error(`Presentation web (${profile} profile) requires NEXT_PUBLIC_SITE_URL=${expectedSiteUrl}, got "${siteUrl}".`);
  }

  const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL?.trim() || '/api/v1';
  if (apiBaseUrl !== '/api/v1') {
    throw new Error(`Presentation web requires same-origin NEXT_PUBLIC_API_BASE_URL="/api/v1", got "${apiBaseUrl}".`);
  }

  const apiProxyTarget = env.API_PROXY_TARGET?.trim();
  if (!apiProxyTarget) {
    throw new Error('API_PROXY_TARGET is required for presentation web.');
  }

  let parsedProxyTarget: URL;
  try {
    parsedProxyTarget = new URL(apiProxyTarget);
  } catch {
    throw new Error(`Invalid API_PROXY_TARGET: "${apiProxyTarget}".`);
  }

  if (parsedProxyTarget.href !== 'http://127.0.0.1:4200/') {
    throw new Error('Presentation API proxy target must be http://127.0.0.1:4200.');
  }

  const port = parseInt(env.PORT?.trim() || '3200', 10);
  if (port !== 3200) {
    throw new Error(`Presentation web port must be 3200, got ${port}.`);
  }

  const host = env.HOST?.trim() || '127.0.0.1';
  if (host !== '127.0.0.1') {
    throw new Error(`Presentation web host must be 127.0.0.1, got "${host}".`);
  }

  return {
    profile,
    siteUrl: expectedSiteUrl,
    apiBaseUrl,
    apiProxyTarget,
    distDir,
    port,
    host,
  };
}
