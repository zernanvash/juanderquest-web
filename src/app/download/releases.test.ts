import { describe, expect, it } from 'vitest';
import {
  CLASSIC_RELEASE,
  designLine,
  parseReleaseTag,
  previousReleases,
  releaseNotes,
  toApkReleases,
} from './releases';

const gh = (tag: string, apk = `juanderquest-${tag}.apk`) => ({
  tag_name: tag,
  published_at: '2026-11-06T04:00:00Z',
  assets: [
    { name: 'SHA256SUMS', size: 100, browser_download_url: 'https://x/SHA256SUMS' },
    { name: 'juanderquest-latest.apk', size: 1, browser_download_url: 'https://x/latest.apk' },
    { name: apk, size: 80_000_000, browser_download_url: `https://x/${apk}` },
  ],
});

describe('download history', () => {
  it('parses old and new tag styles', () => {
    expect(parseReleaseTag('android-v0.2.1+200.1')).toEqual({ versionName: '0.2.1', versionCode: 200 });
    expect(parseReleaseTag('android-v1.0.0+198.1')).toEqual({ versionName: '1.0.0', versionCode: 198 });
    expect(parseReleaseTag('v1')).toBeNull();
  });

  it('starts the history at build 199, newest first, using the versioned APK', () => {
    const list = toApkReleases([gh('android-v0.2.1+200.1'), gh('android-v0.1.199+199.1'), gh('android-v1.0.0+198.1')]);
    expect(list.map((r) => r.versionCode)).toEqual([200, 199]);
    expect(list[0].fileName).toBe('juanderquest-android-v0.2.1+200.1.apk');
    expect(list[0].sizeBytes).toBe(80_000_000);
  });

  it('always keeps v0.1.199, even when GitHub returns nothing usable', () => {
    expect(toApkReleases(null)).toEqual([]);
    expect(toApkReleases([{ tag_name: 'android-v0.2.1+200.1', assets: [] }])).toEqual([CLASSIC_RELEASE]);
    expect(CLASSIC_RELEASE.url).toBe(
      'https://github.com/zernanvash/juanderquest-mobile/releases/download/android-v0.1.199%2B199.1/juanderquest-android-v0.1.199%2B199.1.apk',
    );
  });

  it('lists only builds older than the promoted one (unpromoted CI builds are hidden)', () => {
    const list = toApkReleases([gh('android-v0.2.2+201.1'), gh('android-v0.2.1+200.1'), gh('android-v0.1.199+199.1')]);
    expect(previousReleases(list, 200).map((r) => r.versionName)).toEqual(['0.1.199']);
  });

  it('labels the design line and trims the signing note from release notes', () => {
    expect(designLine('0.1.199')).toBe('Classic design');
    expect(designLine('0.2.1')).toBe('Pixel design');
    expect(releaseNotes('New pixel look.\n\nSigning generation 2: …')).toBe('New pixel look.');
  });
});
