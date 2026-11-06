'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';
import { DitherBackdrop } from './DitherBackdrop';
import styles from './download.module.css';
import { pixelBody, pixelTitle } from './fonts';
import { designLine, previousReleases, releaseNotes, type ApkRelease } from './releases';

const DIRECT_API_DOWNLOAD_URL = `${API_BASE_URL}/app/download`;

interface VersionMeta {
  versionName: string;
  versionCode: number;
  fileName: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
  changelog: string;
}

function formatSize(bytes: number): string {
  return bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : '';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

const FEATURES: [string, string][] = [
  ['Quests & rewards', 'Check in at real places, finish tasks, earn mJDQ points and badges.'],
  ['AR treasure', 'Find gems in augmented reality, guided by Juan.'],
  ['Turn-by-turn routes', 'Navigate Pangasinan with our own routing and map.'],
  ['JuanChoice', 'Vote each week for the spot travelers should visit next.'],
];

export function DownloadClient({ releases }: { releases: ApkRelease[] }) {
  const [version, setVersion] = useState<VersionMeta | null>(null);
  const [versionFailed, setVersionFailed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isHashCopied, setIsHashCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsAndroid(/Android/i.test(ua));
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    setIsInAppBrowser(/FBAN|FBAV|Instagram|TikTok|Line|MicroMessenger|Snapchat/i.test(ua));

    // The promoted build (the in-app update channel), not GitHub's newest build.
    fetch(`${API_BASE_URL}/app/version`)
      .then((res) => res.json())
      .then((res) => {
        const data = res?.data;
        if (!res?.success || !data?.versionCode) throw new Error('no version');
        setVersion({
          versionName: String(data.versionName ?? ''),
          versionCode: Number(data.versionCode),
          fileName: String(data.fileName ?? 'juanderquest-latest.apk'),
          sha256: String(data.sha256 ?? ''),
          sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : 0,
          publishedAt: String(data.publishedAt ?? ''),
          changelog: String(data.changelog ?? ''),
        });
      })
      .catch(() => setVersionFailed(true));
  }, []);

  const copy = async (text: string, done: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked: still confirm, the link is visible on the page.
    }
    done(true);
    setTimeout(() => done(false), 2500);
  };

  const currentCode = version?.versionCode ?? (versionFailed ? releases[0]?.versionCode : undefined);
  const older = currentCode === undefined ? [] : previousReleases(releases, currentCode);
  const notes = version ? releaseNotes(version.changelog) : '';
  const size = version ? formatSize(version.sizeBytes) : '';
  const date = version ? formatDate(version.publishedAt) : '';

  return (
    <main className={cx(pixelTitle.variable, pixelBody.variable, styles.screen)}>
      <DitherBackdrop top="#0d1b2a" bottom="#414844" />

      <div className={styles.column}>
        {/* Top bar, like the app's: square ink buttons with a paper outline */}
        <nav className={styles.topBar} aria-label="Download page">
          <Link
            href="/explore"
            className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}
            aria-label="Open the website"
          >
            <span aria-hidden="true" style={{ fontFamily: 'var(--font-pixel-body), monospace', fontSize: 20 }}>
              ◀
            </span>
          </Link>
          <button
            type="button"
            className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}
            onClick={() =>
              copy(new URL(DIRECT_API_DOWNLOAD_URL, window.location.origin).toString(), setIsCopied)
            }
          >
            {isCopied ? 'Copied!' : 'Share'}
          </button>
        </nav>

        {/* Brand, like the app's start screen */}
        <header className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={260} height={260} className={styles.logo} />
          <h1 className={styles.title}>JuanDerQuest</h1>
          <p className={styles.tagline}>Community-powered travel &amp; discovery</p>
        </header>

        {isInAppBrowser && (
          <div role="alert" className={cx(styles.box, styles.gold, styles.panel)}>
            <p className={styles.heading}>Open in your browser</p>
            <p className={styles.small} style={{ color: 'var(--ink)' }}>
              In-app browsers (Messenger, Instagram, TikTok) often block APK downloads. Tap ••• and
              choose &quot;Open in Chrome&quot;.
            </p>
          </div>
        )}

        {isIOS && (
          <div role="status" className={cx(styles.box, styles.parchment, styles.panel)}>
            <p className={styles.heading}>Android only for now</p>
            <p className={styles.small}>
              The app is for Android phones. On iPhone you can explore right here on the web.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <Link href="/quests" className={cx(styles.box, styles.green, styles.button, styles.smallButton)}>
                <span className={styles.buttonText}>Browse quests</span>
              </Link>
              <Link href="/map" className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}>
                Open map
              </Link>
            </div>
          </div>
        )}

        {/* Latest release */}
        <section aria-labelledby="latest-heading" className={cx(styles.box, styles.parchment, styles.panel)}>
          <div className={styles.panelHead}>
            <span className={cx(styles.box, styles.gold, styles.badge, styles.badgeNew)}>New</span>
            <h2 id="latest-heading" className={styles.heading}>
              Latest version
            </h2>
          </div>

          <div className={styles.latestRow}>
            <div className={styles.version} data-testid="latest-version">
              {version ? `v${version.versionName}` : versionFailed ? 'Latest' : '…'}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pixel/juanIdle.png"
              alt=""
              width={23}
              height={38}
              className={cx(styles.sprite, styles.juan)}
            />
          </div>

          {version && (
            <div className={styles.chipRow}>
              <span className={cx(styles.box, styles.flat, styles.slot, styles.chip)}>
                {designLine(version.versionName)} · Beta · build {version.versionCode}
              </span>
              {date && <span className={cx(styles.box, styles.flat, styles.slot, styles.chip)}>{date}</span>}
            </div>
          )}

          {notes && <p className={styles.notes}>{notes}</p>}

          {downloadStarted && (
            <div className={cx(styles.box, styles.flat, styles.slot, styles.toast)} role="status">
              Downloading… check your notifications or Downloads folder.
            </div>
          )}

          <a
            href={DIRECT_API_DOWNLOAD_URL}
            download={version?.fileName}
            onClick={() => {
              setDownloadStarted(true);
              setTimeout(() => setDownloadStarted(false), 8000);
            }}
            className={cx(styles.box, styles.green, styles.button)}
            style={{ minHeight: 56 }}
            data-testid="download-latest"
          >
            <span className={styles.buttonText}>Download APK</span>
          </a>
          <p className={styles.small}>
            {size ? `${size} · ` : ''}
            {isAndroid ? 'Works on your phone (Android 8.0+)' : 'For Android 8.0 or newer'}
          </p>
        </section>

        {/* Older versions */}
        {older.length > 0 && (
          <details
            className={cx(styles.box, styles.flat, styles.inkBox, styles.details)}
            data-testid="older-versions"
          >
            <summary className={styles.summary}>
              <span className={styles.heading}>Older versions ({older.length})</span>
              <span className={styles.arrow} aria-hidden="true">
                ▶
              </span>
            </summary>
            <p className={cx(styles.small, styles.onDark)}>
              Android can&apos;t install an older version over a newer one. Uninstall JuanDerQuest
              first. Your account and progress stay on the server; anything not yet synced from the
              phone is lost.
            </p>
            <ul className={styles.olderList}>
              {older.map((release) => (
                <li
                  key={release.versionCode}
                  className={cx(styles.box, styles.flat, styles.slot, styles.olderItem)}
                >
                  <div>
                    <div className={styles.olderName}>v{release.versionName}</div>
                    <div className={styles.olderMeta}>
                      {designLine(release.versionName)} · build {release.versionCode}
                      {formatDate(release.publishedAt) && ` · ${formatDate(release.publishedAt)}`}
                      {formatSize(release.sizeBytes) && ` · ${formatSize(release.sizeBytes)}`}
                    </div>
                  </div>
                  <a
                    href={release.url}
                    rel="noopener noreferrer"
                    className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* What's inside */}
        <section aria-labelledby="inside-heading" className={cx(styles.box, styles.wood, styles.panel)}>
          <h2 id="inside-heading" className={styles.heading} style={{ color: 'var(--sun)' }}>
            What&apos;s inside
          </h2>
          <div className={styles.grid}>
            {FEATURES.map(([title, text]) => (
              <div key={title} className={cx(styles.box, styles.flat, styles.slot, styles.feature)}>
                <h3 className={styles.featureTitle}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pixel/questMarker.png" alt="" width={19} height={19} className={styles.sprite} />
                  {title}
                </h3>
                <p className={styles.featureText}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Install guide */}
        <section aria-labelledby="install-heading" className={cx(styles.box, styles.parchment, styles.panel)}>
          <h2 id="install-heading" className={styles.heading}>
            How to install
          </h2>
          <ol className={styles.steps}>
            <li>
              <span>Tap Download APK. If Chrome warns you, tap &quot;Download anyway&quot;.</span>
            </li>
            <li>
              <span>Open the APK from your notifications or Downloads folder.</span>
            </li>
            <li>
              <span>If asked, allow your browser to &quot;Install unknown apps&quot;.</span>
            </li>
            <li>
              <span>Tap Install, then open JuanDerQuest. Later updates install from inside the app.</span>
            </li>
          </ol>
        </section>

        <footer className={styles.footer}>
          <span>
            Package <span className={styles.code}>dev.zernanvash.juanderquest</span>
          </span>
          {version?.sha256 && (
            <span>
              SHA-256 <span className={styles.code}>{version.sha256.slice(0, 16)}…</span>{' '}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => copy(version.sha256, setIsHashCopied)}
              >
                {isHashCopied ? 'Copied!' : 'Copy'}
              </button>
            </span>
          )}
          <Link href="/explore">Explore on the web instead ▶</Link>
        </footer>
      </div>
    </main>
  );
}
