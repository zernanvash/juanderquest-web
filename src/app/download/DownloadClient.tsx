'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { API_BASE_URL } from '@/lib/api';
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

  return (
    <Navigation>
      <div className={`${pixelTitle.variable} ${pixelBody.variable} ${styles.page}`}>
        {isInAppBrowser && (
          <div role="alert" className={`${styles.box} ${styles.alert} ${styles.alertWarn}`}>
            <span className={styles.badge}>!</span>
            <div className={styles.body}>
              <p className={styles.label}>Open in your browser</p>
              <p>
                In-app browsers (Messenger, Instagram, TikTok) often block APK downloads. Tap the
                ••• menu and choose &quot;Open in Chrome&quot;.
              </p>
            </div>
          </div>
        )}

        {isIOS && (
          <div role="status" className={`${styles.box} ${styles.alert} ${styles.alertInfo}`}>
            <span className={styles.badge}>i</span>
            <div className={styles.body}>
              <p className={styles.label}>Android only for now</p>
              <p>
                The app is for Android phones. On iPhone you can explore quests and the map right
                here on the web.
              </p>
              <div className={styles.actions} style={{ marginTop: 10 }}>
                <Link href="/quests" className={`${styles.button} ${styles.secondary} ${styles.small}`}>
                  Browse quests
                </Link>
                <Link href="/map" className={`${styles.button} ${styles.secondary} ${styles.small}`}>
                  Open map
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.heroText}>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>Android · Beta</span>
            <h1 className={styles.title}>JuanDerQuest</h1>
            <p className={styles.heroLine}>Quests, AR and maps for exploring Pangasinan.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pixel/juanIdle.png"
            alt="Juan, the JuanDerQuest guide"
            width={92}
            height={152}
            className={styles.sprite}
          />
        </header>

        {/* Latest release */}
        <section aria-labelledby="latest-heading" className={`${styles.box} ${styles.parchment} ${styles.latest}`}>
          <div className={styles.latestHead}>
            <span className={`${styles.badge} ${styles.badgeNew}`}>New</span>
            <h2 id="latest-heading" className={styles.heading}>
              Latest version
            </h2>
          </div>

          <div>
            <div className={styles.version} data-testid="latest-version">
              {version ? `v${version.versionName}` : versionFailed ? 'Latest' : '…'}
            </div>
            {version && (
              <div className={styles.meta} style={{ marginTop: 8 }}>
                {designLine(version.versionName)} · build {version.versionCode}
                {formatDate(version.publishedAt) && ` · ${formatDate(version.publishedAt)}`}
                {size && ` · ${size}`}
              </div>
            )}
          </div>

          {notes && <p className={styles.notes}>{notes}</p>}

          {downloadStarted && (
            <div className={styles.toast} role="status">
              Downloading… check your notifications or Downloads folder for{' '}
              <span className={styles.code}>{version?.fileName ?? 'the APK'}</span>.
            </div>
          )}

          <div className={styles.actions}>
            <a
              href={DIRECT_API_DOWNLOAD_URL}
              download={version?.fileName}
              onClick={() => {
                setDownloadStarted(true);
                setTimeout(() => setDownloadStarted(false), 8000);
              }}
              className={`${styles.button} ${styles.primary}`}
              data-testid="download-latest"
            >
              ▼ Download APK{size ? ` (${size})` : ''}
            </a>
            <button
              type="button"
              onClick={() =>
                copy(
                  typeof window !== 'undefined'
                    ? new URL(DIRECT_API_DOWNLOAD_URL, window.location.origin).toString()
                    : DIRECT_API_DOWNLOAD_URL,
                  setIsCopied,
                )
              }
              className={`${styles.button} ${styles.secondary}`}
            >
              {isCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>

          {isAndroid && (
            <p className={styles.meta} style={{ margin: 0 }}>
              ✓ Works on your phone (Android 8.0 or newer).
            </p>
          )}
        </section>

        {/* Older versions */}
        {older.length > 0 && (
          <details className={`${styles.box} ${styles.paper} ${styles.details}`} data-testid="older-versions">
            <summary className={styles.summary}>
              <span className={styles.heading}>Older versions ({older.length})</span>
              <span className={styles.arrow} aria-hidden="true">
                ▶
              </span>
            </summary>
            <div className={styles.olderBody}>
              <p className={styles.featureText}>
                Android can&apos;t install an older version over a newer one. Uninstall
                JuanDerQuest first; your account and progress stay on the server, but anything
                not yet synced from the phone is lost.
              </p>
              <ul className={styles.olderList}>
                {older.map((release) => (
                  <li key={release.versionCode} className={`${styles.slot} ${styles.olderItem}`}>
                    <div>
                      <div className={styles.olderName}>v{release.versionName}</div>
                      <div className={styles.meta}>
                        <span className={styles.chip}>{designLine(release.versionName)}</span>{' '}
                        build {release.versionCode}
                        {formatDate(release.publishedAt) && ` · ${formatDate(release.publishedAt)}`}
                        {formatSize(release.sizeBytes) && ` · ${formatSize(release.sizeBytes)}`}
                      </div>
                    </div>
                    <a
                      href={release.url}
                      rel="noopener noreferrer"
                      className={`${styles.button} ${styles.secondary} ${styles.small}`}
                    >
                      ▼ v{release.versionName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        {/* What's inside */}
        <section aria-labelledby="inside-heading" className={`${styles.box} ${styles.wood}`}>
          <h2 id="inside-heading" className={styles.heading} style={{ color: 'var(--sun)' }}>
            What&apos;s inside
          </h2>
          <div className={styles.grid} style={{ marginTop: 12 }}>
            {[
              ['Quests & rewards', 'Check in at real places, finish tasks and earn mJDQ points and badges.'],
              ['AR treasure', 'Find gems in augmented reality, guided by Juan.'],
              ['Turn-by-turn routes', 'Navigate Pangasinan with our own routing server and map.'],
              ['JuanChoice', 'Vote each week for the spot travelers should visit next.'],
            ].map(([title, text]) => (
              <div key={title} className={styles.slot}>
                <h3 className={`${styles.label} ${styles.featureTitle}`}>
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
        <section aria-labelledby="install-heading" className={`${styles.box} ${styles.paper}`}>
          <h2 id="install-heading" className={styles.heading}>
            How to install
          </h2>
          <ol className={styles.steps}>
            <li>
              <span>
                Tap <strong>Download APK</strong>. If Chrome warns you, tap &quot;Download anyway&quot;.
              </span>
            </li>
            <li>
              <span>
                Open <span className={styles.code}>{version?.fileName ?? 'the APK'}</span> from your
                notifications or Downloads folder.
              </span>
            </li>
            <li>
              <span>If asked, allow your browser to &quot;Install unknown apps&quot;.</span>
            </li>
            <li>
              <span>Tap Install, then open JuanDerQuest. Updates install in place from the app.</span>
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
              <button type="button" className={styles.linkButton} onClick={() => copy(version.sha256, setIsHashCopied)}>
                {isHashCopied ? 'Copied!' : 'Copy'}
              </button>
            </span>
          )}
        </footer>

        <div className={styles.back}>
          <Link href="/explore">Explore on the web instead ▶</Link>
        </div>
      </div>
    </Navigation>
  );
}
