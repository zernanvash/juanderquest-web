#!/usr/bin/env node
/**
 * start-presentation.mjs
 * Starts the Next.js presentation web application on 127.0.0.1:3200 from .next-presentation.
 *
 * Hard safety boundaries:
 * 1. Binds exclusively to 127.0.0.1:3200.
 * 2. Enforces NEXT_DIST_DIR=.next-presentation.
 * 3. Enforces API_PROXY_TARGET=http://127.0.0.1:4200.
 * 4. Checks that .next-presentation exists before starting.
 * 5. Checks that port 3200 is available (not occupied).
 * 6. Supports --check for non-mutating preflight.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeBundleSha256 } from './build-presentation.mjs';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isCheckOnly = process.argv.includes('--check');

export async function isPortInUse(host, port) {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolvePort(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolvePort(false);
    });
  });
}

export function getProfile(argv = process.argv, env = process.env) {
  for (const arg of argv) {
    if (arg === '--profile=public' || arg === '--public') return 'public';
    if (arg === '--profile=local' || arg === '--local') return 'local';
  }
  const envProfile = env.JDQ_PRESENTATION_PROFILE?.trim();
  if (envProfile === 'public') return 'public';
  return 'local';
}

export function validateRunConfig(env = process.env, argv = process.argv) {
  const distDir = env.NEXT_DIST_DIR?.trim() || '.next-presentation';
  if (distDir !== '.next-presentation') {
    throw new Error(`Presentation start requires NEXT_DIST_DIR=".next-presentation", got "${distDir}".`);
  }

  const profile = getProfile(argv, env);

  const port = parseInt(env.PORT?.trim() || '3200', 10);
  if (port !== 3200) {
    throw new Error(`Presentation web must bind port 3200, got ${port}.`);
  }

  const host = env.HOST?.trim() || '127.0.0.1';
  if (host !== '127.0.0.1') {
    throw new Error(`Presentation web must bind 127.0.0.1, got "${host}".`);
  }

  const apiProxyTarget = env.API_PROXY_TARGET?.trim() || 'http://127.0.0.1:4200';
  let parsedProxy;
  try {
    parsedProxy = new URL(apiProxyTarget);
  } catch {
    throw new Error(`Invalid API_PROXY_TARGET URL: "${apiProxyTarget}".`);
  }

  if (parsedProxy.href !== 'http://127.0.0.1:4200/') {
    throw new Error('Presentation API proxy target must be http://127.0.0.1:4200.');
  }

  const expectedSiteUrl = profile === 'public'
    ? 'https://presentation.juanderquest.app'
    : 'http://127.0.0.1:3200';

  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim() || expectedSiteUrl;
  let parsedSite;
  try {
    parsedSite = new URL(siteUrl);
  } catch {
    throw new Error(`Invalid NEXT_PUBLIC_SITE_URL: "${siteUrl}".`);
  }

  if (parsedSite.origin !== new URL(expectedSiteUrl).origin || (parsedSite.pathname !== '/' && parsedSite.pathname !== '')) {
    throw new Error(`Presentation start (${profile} profile) requires NEXT_PUBLIC_SITE_URL=${expectedSiteUrl}, got "${siteUrl}".`);
  }

  if (parsedSite.origin === 'https://juanderquest.app' || parsedSite.origin === 'https://api.juanderquest.app') {
    throw new Error('Presentation start cannot use ordinary alpha origins.');
  }

  return {
    distDir,
    profile,
    port,
    host,
    apiProxyTarget,
    siteUrl: expectedSiteUrl,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  (async () => {
    try {
      const config = validateRunConfig(process.env, process.argv);
      const distDirPath = resolve(webRoot, config.distDir);

      const portOccupied = await isPortInUse(config.host, config.port);
      if (portOccupied && !isCheckOnly) {
        throw new Error(`Loopback port ${config.host}:${config.port} is already in use.`);
      }

      const buildExists = existsSync(distDirPath);
      const manifestPath = resolve(distDirPath, 'presentation-profile.json');
      let buildManifest = null;
      if (existsSync(manifestPath)) {
        try {
          const { readFileSync } = await import('node:fs');
          buildManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        } catch (e) {
          throw new Error(`Failed to parse presentation build profile manifest at ${manifestPath}: ${e.message}`);
        }
      }

      process.stdout.write(`PREFLIGHT_PRESENTATION_RUN host=${config.host} port=${config.port} distDir=${config.distDir} buildExists=${buildExists} portOccupied=${portOccupied} profile=${config.profile} buildProfile=${buildManifest?.profile ?? 'none'}\n`);

      if (!buildExists) {
        throw new Error(`Presentation build directory ${config.distDir} does not exist. Run build-presentation.mjs first.`);
      }

      if (!buildManifest) {
        throw new Error(
          `Missing presentation-profile.json in ${config.distDir}. Rebuild using "node scripts/build-presentation.mjs --profile=${config.profile}".`
        );
      }

      if (buildManifest.profile !== config.profile) {
        throw new Error(
          `FATAL: Build profile mismatch. Artifact was built for profile="${buildManifest.profile}" (${buildManifest.siteUrl}) but runtime requested profile="${config.profile}" (${config.siteUrl}). Rebuild with "node scripts/build-presentation.mjs --profile=${config.profile}".`
        );
      }

      const buildIdPath = resolve(distDirPath, 'BUILD_ID');
      const currentBuildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, 'utf8').trim() : '';
      if (!currentBuildId || currentBuildId !== buildManifest.buildId) {
        throw new Error(
          `FATAL: BUILD_ID mismatch or missing. Recorded="${buildManifest.buildId}", Found="${currentBuildId}". Rebuild with "node scripts/build-presentation.mjs --profile=${config.profile}".`
        );
      }

      if (!buildManifest.bundleSha256) {
        throw new Error(
          `FATAL: presentation-profile.json is missing bundleSha256. Rebuild with "node scripts/build-presentation.mjs --profile=${config.profile}".`
        );
      }

      const computed = computeBundleSha256(distDirPath);
      if (computed.bundleSha256 !== buildManifest.bundleSha256) {
        throw new Error(
          `FATAL: Build artifact integrity verification failed. Computed bundleSha256="${computed.bundleSha256}" does not match recorded bundleSha256="${buildManifest.bundleSha256}". Artifact files have changed or corrupted. Rebuild with "node scripts/build-presentation.mjs --profile=${config.profile}".`
        );
      }

      if (isCheckOnly) {
        process.stdout.write(
          `CHECK_RESULT presentation_web_run=valid dry_run=true buildReady=true portAvailable=${!portOccupied} profile=${config.profile} buildProfile=${buildManifest.profile} profileMatch=true buildIdMatch=true bundleVerified=true bundleSha256=${computed.bundleSha256}\n`
        );
        process.exit(0);
      }

      const nextCli = resolve(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
      const runEnv = {
        ...process.env,
        JDQ_PRESENTATION_PROFILE: config.profile,
        PORT: String(config.port),
        HOST: config.host,
        NEXT_DIST_DIR: config.distDir,
        API_PROXY_TARGET: config.apiProxyTarget,
        NEXT_PUBLIC_SITE_URL: config.siteUrl,
        NEXT_PUBLIC_API_BASE_URL: '/api/v1',
        NEXT_PUBLIC_JDQ_PRESENTATION_MODE: 'true',
      };

      process.stdout.write(`Starting Next.js presentation server on http://${config.host}:${config.port}...\n`);
      const child = spawn(process.execPath, [nextCli, 'start', '-p', String(config.port), '-H', config.host], {
        cwd: webRoot,
        env: runEnv,
        stdio: 'inherit',
      });

      const handleSignal = (signal) => {
        child.kill(signal);
      };
      process.on('SIGINT', () => handleSignal('SIGINT'));
      process.on('SIGTERM', () => handleSignal('SIGTERM'));

      child.on('exit', (code, signal) => {
        if (signal) {
          process.kill(process.pid, signal);
        } else {
          process.exit(code ?? 0);
        }
      });
    } catch (error) {
      process.stderr.write(`RUN_RESULT presentation_web_run=failed reason=${error instanceof Error ? error.message : 'unknown'}\n`);
      process.exit(1);
    }
  })();
}
