#!/usr/bin/env node
/**
 * build-presentation.mjs
 * Builds the Next.js presentation web application into .next-presentation.
 *
 * Hard safety boundaries:
 * 1. NEVER touches default .next directory.
 * 2. Enforces NEXT_DIST_DIR=.next-presentation.
 * 3. Enforces API_PROXY_TARGET=http://127.0.0.1:4200 (rejects port 4000 or public API).
 * 4. Supports --check to dry-run configuration without building.
 */

import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isCheckOnly = process.argv.includes('--check');

export function computeBundleSha256(distDirPath) {
  function walkDir(dir) {
    const results = [];
    if (!existsSync(dir)) return results;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      const rel = relative(distDirPath, full).replace(/\\/g, '/');
      if (['cache', 'diagnostics', 'trace', 'presentation-profile.json'].some((p) => rel === p || rel.startsWith(p + '/'))) {
        continue;
      }
      if (entry.isDirectory()) {
        results.push(...walkDir(full));
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
    return results.sort();
  }

  const files = walkDir(distDirPath);
  const bundleHasher = createHash('sha256');
  for (const file of files) {
    const rel = relative(distDirPath, file).replace(/\\/g, '/');
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    bundleHasher.update(`${rel}:${hash}\n`);
  }
  return {
    bundleSha256: bundleHasher.digest('hex'),
    bundleFileCount: files.length,
  };
}

export function computeSourceTreeSha256(repoDir) {
  try {
    const allFilesRaw = execSync('git ls-files -c -m -o --exclude-standard', { cwd: repoDir, encoding: 'utf8' }).trim();
    const allFiles = Array.from(new Set(allFilesRaw ? allFilesRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [])).sort();
    const treeHasher = createHash('sha256');
    for (const relPath of allFiles) {
      const filePath = resolve(repoDir, relPath);
      if (!existsSync(filePath) || !statSync(filePath).isFile()) continue;
      const fileSha = createHash('sha256').update(readFileSync(filePath)).digest('hex');
      treeHasher.update(`${relPath.replace(/\\/g, '/')}:${fileSha}\n`);
    }
    return treeHasher.digest('hex');
  } catch {
    return 'unknown';
  }
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

export function validateBuildConfig(env = process.env, argv = process.argv) {
  const distDir = env.NEXT_DIST_DIR?.trim() || '.next-presentation';
  if (distDir !== '.next-presentation') {
    throw new Error(`Presentation build requires NEXT_DIST_DIR=".next-presentation", got "${distDir}".`);
  }

  const profile = getProfile(argv, env);

  const apiProxyTarget = env.API_PROXY_TARGET?.trim() || 'http://127.0.0.1:4200';
  let parsedProxy;
  try {
    parsedProxy = new URL(apiProxyTarget);
  } catch {
    throw new Error(`Invalid API_PROXY_TARGET URL: "${apiProxyTarget}".`);
  }

  if (parsedProxy.href !== 'http://127.0.0.1:4200/') {
    throw new Error('Presentation build requires API_PROXY_TARGET=http://127.0.0.1:4200.');
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
    throw new Error(`Presentation build (${profile} profile) requires NEXT_PUBLIC_SITE_URL=${expectedSiteUrl}, got "${siteUrl}".`);
  }

  if (parsedSite.origin === 'https://juanderquest.app' || parsedSite.origin === 'https://api.juanderquest.app') {
    throw new Error('Presentation build cannot use ordinary alpha origins.');
  }

  const apiBaseUrl = env.NEXT_PUBLIC_API_BASE_URL?.trim() || '/api/v1';
  if (apiBaseUrl !== '/api/v1') {
    throw new Error(`Presentation build requires NEXT_PUBLIC_API_BASE_URL="/api/v1", got "${apiBaseUrl}".`);
  }

  return {
    distDir,
    profile,
    apiProxyTarget,
    siteUrl: expectedSiteUrl,
    apiBaseUrl,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const config = validateBuildConfig(process.env, process.argv);
    process.stdout.write(`PREFLIGHT_PRESENTATION_BUILD distDir=${config.distDir} proxy=${config.apiProxyTarget} siteUrl=${config.siteUrl} apiBase=${config.apiBaseUrl} profile=${config.profile}\n`);

    if (isCheckOnly) {
      process.stdout.write(`CHECK_RESULT presentation_web_build=valid dry_run=true live_next_untouched=true profile=${config.profile}\n`);
      process.exit(0);
    }

    const buildStartAt = new Date().toISOString();
    const sourceTreeSha256 = computeSourceTreeSha256(webRoot);
    process.stdout.write(`Source tree SHA-256 before build: ${sourceTreeSha256}\n`);

    const nextCli = resolve(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    const buildEnv = {
      ...process.env,
      JDQ_PRESENTATION_PROFILE: config.profile,
      NEXT_DIST_DIR: config.distDir,
      API_PROXY_TARGET: config.apiProxyTarget,
      NEXT_PUBLIC_SITE_URL: config.siteUrl,
      NEXT_PUBLIC_API_BASE_URL: config.apiBaseUrl,
      NEXT_PUBLIC_JDQ_PRESENTATION_MODE: 'true',
    };

    process.stdout.write(`Starting Next.js presentation build into .next-presentation (profile: ${config.profile})...\n`);
    execFileSync(process.execPath, [nextCli, 'build'], {
      cwd: webRoot,
      env: buildEnv,
      stdio: 'inherit',
    });

    const buildCompletedAt = new Date().toISOString();
    const distDirPath = resolve(webRoot, config.distDir);
    const buildIdPath = resolve(distDirPath, 'BUILD_ID');
    const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, 'utf8').trim() : 'unknown';

    const bundleInfo = computeBundleSha256(distDirPath);

    const profileManifest = {
      profile: config.profile,
      siteUrl: config.siteUrl,
      apiProxyTarget: config.apiProxyTarget,
      apiBaseUrl: config.apiBaseUrl,
      builtAt: buildCompletedAt,
      buildStartAt,
      buildCompletedAt,
      buildId,
      sourceTreeSha256,
      bundleSha256: bundleInfo.bundleSha256,
      bundleFileCount: bundleInfo.bundleFileCount,
    };

    writeFileSync(
      resolve(distDirPath, 'presentation-profile.json'),
      JSON.stringify(profileManifest, null, 2),
      'utf8'
    );

    process.stdout.write(
      `BUILD_RESULT presentation_web_build=success distDir=.next-presentation profile=${config.profile} buildId=${buildId} bundleSha256=${bundleInfo.bundleSha256} sourceTreeSha256=${sourceTreeSha256}\n`
    );
  } catch (error) {
    process.stderr.write(`BUILD_RESULT presentation_web_build=failed reason=${error instanceof Error ? error.message : 'unknown'}\n`);
    process.exit(1);
  }
}
