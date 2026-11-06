/**
 * APK release history for /download (owner 2026-11-06: "have a history from now on").
 * History starts at build 199 (v0.1.199, the last classic-design release). Older builds are
 * not listed. Files come from GitHub Releases, where CI publishes every build.
 */

export interface ApkRelease {
  versionName: string;
  versionCode: number;
  tag: string;
  fileName: string;
  url: string;
  sizeBytes: number;
  publishedAt: string;
}

export const HISTORY_START_BUILD = 199;

const REPO = 'zernanvash/juanderquest-mobile';

/** "android-v0.1.199+199.1" → { versionName: "0.1.199", versionCode: 199 } */
export function parseReleaseTag(tag: string): { versionName: string; versionCode: number } | null {
  const match = /^android-v([0-9][0-9A-Za-z.\-]*)\+(\d+)(?:\.\d+)?$/.exec(tag);
  if (!match) return null;
  return { versionName: match[1], versionCode: Number(match[2]) };
}

export function releaseAssetUrl(tag: string, fileName: string): string {
  return `https://github.com/${REPO}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(fileName)}`;
}

/** v0.1.199 is always listed, even if the GitHub API is unreachable or rate-limited. */
export const CLASSIC_RELEASE: ApkRelease = {
  versionName: '0.1.199',
  versionCode: 199,
  tag: 'android-v0.1.199+199.1',
  fileName: 'juanderquest-android-v0.1.199+199.1.apk',
  url: releaseAssetUrl('android-v0.1.199+199.1', 'juanderquest-android-v0.1.199+199.1.apk'),
  sizeBytes: 0,
  publishedAt: '2026-11-03T00:00:00Z',
};

interface GithubRelease {
  tag_name?: string;
  draft?: boolean;
  published_at?: string | null;
  assets?: { name?: string; size?: number; browser_download_url?: string }[];
}

/** Turns the GitHub releases list into APK releases (build ≥ 199, newest first, one per build). */
export function toApkReleases(raw: unknown): ApkRelease[] {
  if (!Array.isArray(raw)) return [];
  const byCode = new Map<number, ApkRelease>();
  for (const release of raw as GithubRelease[]) {
    if (!release || release.draft || !release.tag_name) continue;
    const parsed = parseReleaseTag(release.tag_name);
    if (!parsed || parsed.versionCode < HISTORY_START_BUILD) continue;
    const apk = (release.assets ?? []).find(
      (asset) => asset.name?.endsWith('.apk') && asset.name !== 'juanderquest-latest.apk',
    );
    if (!apk?.name || !apk.browser_download_url) continue;
    if (byCode.has(parsed.versionCode)) continue;
    byCode.set(parsed.versionCode, {
      ...parsed,
      tag: release.tag_name,
      fileName: apk.name,
      url: apk.browser_download_url,
      sizeBytes: apk.size ?? 0,
      publishedAt: release.published_at ?? '',
    });
  }
  if (!byCode.has(CLASSIC_RELEASE.versionCode)) {
    byCode.set(CLASSIC_RELEASE.versionCode, CLASSIC_RELEASE);
  }
  return [...byCode.values()].sort((a, b) => b.versionCode - a.versionCode);
}

/** Server-side: the GitHub releases list, cached for 10 minutes. Falls back to v0.1.199 only. */
export async function fetchApkReleases(): Promise<ApkRelease[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=50`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [CLASSIC_RELEASE];
    return toApkReleases(await res.json());
  } catch {
    return [CLASSIC_RELEASE];
  }
}

/**
 * Releases older than the promoted build. Builds CI made but that were never promoted to the
 * in-app update channel (newer than `currentCode`) are left out.
 */
export function previousReleases(releases: ApkRelease[], currentCode: number): ApkRelease[] {
  return releases.filter((release) => release.versionCode < currentCode);
}

/** "0.1.n" is the classic design, "0.2.n" and later the pixel design (owner 2026-11-02). */
export function designLine(versionName: string): string {
  return versionName.startsWith('0.1.') ? 'Classic design' : 'Pixel design';
}

/** The release notes travelers care about: the first paragraph, without the signing boilerplate. */
export function releaseNotes(changelog: string): string {
  return changelog.split(/\n\s*\n/)[0]?.trim() ?? '';
}
