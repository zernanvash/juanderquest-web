'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { API_BASE_URL } from '@/lib/api';
import { appOnlyLabel } from '@/config/appOnlyRoutes';
import { DitherBackdrop } from './DitherBackdrop';
import styles from './download.module.css';
import { pixelBody, pixelTitle } from './fonts';
import { AR_SANDBOX_URL, designLine, previousReleases, type ApkRelease } from './releases';

const DIRECT_API_DOWNLOAD_URL = `${API_BASE_URL}/app/download`;

interface VersionMeta {
  versionName: string;
  versionCode: number;
  fileName: string;
  sizeBytes: number;
}

function formatSize(bytes: number): string {
  return bytes > 0 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : '';
}

function formatBetaVersion(versionName: string | undefined): string {
  if (!versionName) return 'v0.3 BETA';
  const clean = versionName.replace(/^v/i, '').trim();
  return clean ? `v${clean} BETA` : 'v0.3 BETA';
}

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

const FEATURES: { title: string; text: string; icon: string }[] = [
  {
    title: 'Real-World Quests',
    text: 'Check in at Pangasinan landmarks, complete challenges, and level up your Traveler Passport.',
    icon: '/pixel/questMarker.png',
  },
  {
    title: 'AR Treasure & Mini-Games',
    text: 'Spot 3D pixel markers on-site and play classic Laro ng Lahi AR mini-games.',
    icon: '/pixel/juanIdle.png',
  },
  {
    title: 'Smart Routes & Maps',
    text: 'Discover quieter hidden gems and navigate straight to every stop with turn-by-turn routes.',
    icon: '/illustrations/nature-coast.svg',
  },
  {
    title: 'Suki Cards & Local Perks',
    text: 'Collect stamps at partner shops and redeem traveler vouchers across Pangasinan.',
    icon: '/jdq-token.png',
  },
];

const HIGHLIGHTS = [
  'Scan Suki QR at partner shops to earn stamps',
  'Play AR Laro ng Lahi mini-games at landmarks',
  'Discover hidden Pangasinan gems without crowds',
  'Vote weekly in JuanChoice for top local spots',
];

export function DownloadClient({ releases = [] }: { releases?: ApkRelease[] }) {
  const containerRef = useRef<HTMLElement>(null);
  const ctaWrapRef = useRef<HTMLDivElement>(null);

  const [version, setVersion] = useState<VersionMeta | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [appOnly, setAppOnly] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsAndroid(/Android/i.test(ua));
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    setIsInAppBrowser(/FBAN|FBAV|Instagram|TikTok|Line|MicroMessenger|Snapchat/i.test(ua));
    setAppOnly(appOnlyLabel(new URLSearchParams(window.location.search).get('feature')));

    fetch(`${API_BASE_URL}/app/version`)
      .then((res) => res.json())
      .then((res) => {
        const data = res?.data;
        if (!res?.success || !data?.versionName) return;
        setVersion({
          versionName: String(data.versionName ?? ''),
          versionCode: typeof data.versionCode === 'number' ? data.versionCode : 0,
          fileName: String(data.fileName ?? 'juanderquest-beta.apk'),
          sizeBytes: typeof data.sizeBytes === 'number' ? data.sizeBytes : 0,
        });
      })
      .catch(() => {
        // Fallback label "v0.3 BETA" stays visible.
      });
  }, []);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setHighlightIndex((i) => (i + 1) % HIGHLIGHTS.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, []);

  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      gsap.registerPlugin(ScrollTrigger, useGSAP);
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-anim="hero"]', {
          y: 16,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        });

        gsap.to('[data-anim="mascot-bob"]', {
          y: -6,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'steps(3)',
        });

        gsap.to('[data-anim="logo-float"]', {
          y: -5,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });

        gsap.from('[data-anim="feature-card"]', {
          y: 18,
          opacity: 0,
          duration: 0.45,
          stagger: 0.1,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: '[data-anim="features-grid"]',
            start: 'top 88%',
            once: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: containerRef },
  );

  const spawnPixelBurst = () => {
    const host = ctaWrapRef.current;
    if (!host) return;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const colors = ['#ffb703', '#c1ecd4', '#faf9f5', '#3f6653'];
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement('span');
      dot.className = styles.sparklePixel;
      dot.style.background = colors[i % colors.length];
      host.appendChild(dot);
      const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.3;
      const distance = 44 + Math.random() * 52;
      gsap.fromTo(
        dot,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 12,
          scale: 0.4,
          opacity: 0,
          duration: 0.65,
          ease: 'power2.out',
          onComplete: () => dot.remove(),
        },
      );
    }
  };

  const copyShareUrl = async () => {
    const shareUrl = `${window.location.origin}/download`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard blocked on insecure origin; still confirm feedback.
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const betaLabel = formatBetaVersion(version?.versionName);
  const size = version ? formatSize(version.sizeBytes) : '';
  const older = version?.versionCode ? previousReleases(releases, version.versionCode) : [];
  const reportBugHref = `/report-bug?version=${encodeURIComponent(betaLabel)}`;

  return (
    <main ref={containerRef} className={cx(pixelTitle.variable, pixelBody.variable, styles.screen)}>
      <DitherBackdrop top="#0d1b2a" bottom="#414844" />

      <div className={styles.column}>
        {/* Top bar */}
        <nav className={styles.topBar} aria-label="Download page">
          <Link
            href="/explore"
            className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}
            aria-label="Explore on the web"
          >
            <span aria-hidden="true" style={{ fontFamily: 'var(--font-pixel-body), monospace', fontSize: 16 }}>
              ◀
            </span>
            <span>Web</span>
          </Link>

          <div className={styles.topActions}>
            <Link
              href={reportBugHref}
              className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}
              data-testid="nav-report-bug"
            >
              Report Bug
            </Link>
            <button
              type="button"
              className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}
              onClick={copyShareUrl}
            >
              {isCopied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </nav>

        {/* Hero brand */}
        <header className={styles.brand} data-anim="hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="JuanDerQuest"
            width={240}
            height={240}
            className={styles.logo}
            data-anim="logo-float"
          />
          <h1 className={styles.title}>Turn Pangasinan Into Your Next Adventure</h1>
          <p className={styles.tagline}>
            Play real-world quests, hunt AR treasures, and unlock local Suki perks — free on Android.
          </p>
        </header>

        {appOnly && (
          <div role="status" data-testid="app-only-notice" className={cx(styles.box, styles.gold, styles.panel)}>
            <p className={styles.heading}>{appOnly}: in the Android app</p>
            <p className={styles.small} style={{ color: 'var(--ink)' }}>
              Get the beta app below to unlock this feature, or browse destinations on the web.
            </p>
          </div>
        )}

        {isInAppBrowser && (
          <div role="alert" className={cx(styles.box, styles.gold, styles.panel)}>
            <p className={styles.heading}>Open in Chrome to download</p>
            <p className={styles.small} style={{ color: 'var(--ink)' }}>
              In-app browsers (Messenger, Instagram, TikTok) often block app installers. Tap ••• and choose
              &quot;Open in Chrome&quot;.
            </p>
          </div>
        )}

        {isIOS && (
          <div role="status" className={cx(styles.box, styles.parchment, styles.panel)}>
            <p className={styles.heading}>Android Beta for now</p>
            <p className={styles.small}>
              The mobile app is currently for Android phones. On iPhone, you can explore spots and the map right
              here on the web.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <Link href="/explore" className={cx(styles.box, styles.green, styles.button, styles.smallButton)}>
                <span className={styles.buttonText}>Explore spots</span>
              </Link>
              <Link href="/map" className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}>
                Open map
              </Link>
            </div>
          </div>
        )}

        {/* Primary Download CTA Card */}
        <section
          aria-labelledby="latest-heading"
          className={cx(styles.box, styles.parchment, styles.panel)}
          data-anim="hero"
        >
          <div className={styles.panelHead}>
            <span className={cx(styles.box, styles.gold, styles.badge, styles.badgeNew)}>OPEN BETA</span>
            <h2 id="latest-heading" className={styles.heading}>
              Android App
            </h2>
          </div>

          <div className={styles.latestRow}>
            <div className={styles.version} data-testid="latest-version">
              {betaLabel}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pixel/juanIdle.png"
              alt=""
              width={23}
              height={38}
              className={cx(styles.sprite, styles.juan)}
              data-anim="mascot-bob"
            />
          </div>

          <div className={styles.tickerSlot} aria-live="polite">
            <span className={styles.tickerDot} aria-hidden="true">
              ▶
            </span>
            <span>{HIGHLIGHTS[highlightIndex]}</span>
          </div>

          {downloadStarted && (
            <div className={cx(styles.box, styles.flat, styles.slot, styles.toast)} role="status">
              Downloading JuanDerQuest Beta… Check your notifications or Downloads folder.
            </div>
          )}

          <div ref={ctaWrapRef} className={styles.ctaWrap}>
            <a
              href={DIRECT_API_DOWNLOAD_URL}
              download={version?.fileName}
              onClick={() => {
                spawnPixelBurst();
                setDownloadStarted(true);
                setTimeout(() => setDownloadStarted(false), 8000);
              }}
              className={cx(styles.box, styles.green, styles.button)}
              style={{ minHeight: 56 }}
              data-testid="download-latest"
            >
              <span className={styles.buttonText}>Download for Android</span>
            </a>
          </div>

          <p className={styles.small}>
            Free{size ? ` · ${size}` : ''} ·{' '}
            {isAndroid ? 'Ready for your Android phone (8.0+)' : 'Android 8.0 or newer'}
          </p>
        </section>

        {/* Open Beta / Under Heavy Development Disclaimer */}
        <section
          aria-labelledby="beta-disclaimer-heading"
          className={cx(styles.box, styles.gold, styles.panel)}
          data-testid="beta-disclaimer"
          data-anim="hero"
        >
          <div className={styles.disclaimerHead}>
            <h2 id="beta-disclaimer-heading" className={styles.heading} style={{ color: 'var(--ink)' }}>
              Heavily Under Development
            </h2>
          </div>
          <p className={styles.small} style={{ color: 'var(--ink)', marginTop: 8 }}>
            JuanDerQuest is in active Open Beta and evolves every week. You may encounter occasional bugs,
            rough edges, or changing features. Rewards and wallet features currently run in beta/testnet mode.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link
              href={reportBugHref}
              className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}
              data-testid="disclaimer-report-bug"
            >
              Found an issue? Report a Bug →
            </Link>
          </div>
        </section>

        {/* What you can do */}
        <section aria-labelledby="inside-heading" className={cx(styles.box, styles.wood, styles.panel)}>
          <h2 id="inside-heading" className={styles.heading} style={{ color: 'var(--sun)' }}>
            What you can do
          </h2>
          <div className={styles.grid} data-anim="features-grid">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className={cx(styles.box, styles.flat, styles.slot, styles.feature)}
                data-anim="feature-card"
              >
                <h3 className={styles.featureTitle}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={feat.icon} alt="" width={20} height={20} className={styles.sprite} />
                  {feat.title}
                </h3>
                <p className={styles.featureText}>{feat.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Simplified 3-step install guide */}
        <section aria-labelledby="install-heading" className={cx(styles.box, styles.parchment, styles.panel)}>
          <h2 id="install-heading" className={styles.heading}>
            Ready in 60 seconds
          </h2>
          <ol className={styles.steps}>
            <li>
              <span>Tap Download for Android. If Chrome asks to confirm, tap &quot;Download anyway&quot;.</span>
            </li>
            <li>
              <span>Open the downloaded file and allow &quot;Install unknown apps&quot; once if prompted.</span>
            </li>
            <li>
              <span>Tap Install and start exploring — future updates install right inside the app.</span>
            </li>
          </ol>
        </section>

        {/* Other versions (owner 2026-11-24): the AR sandbox, then builds older than the promoted one */}
        <details className={cx(styles.box, styles.parchment, styles.panel, styles.details)} data-testid="other-versions">
          <summary className={styles.summary}>
            <span className={styles.heading}>Other versions</span>
            <span className={styles.arrow} aria-hidden="true">
              ▶
            </span>
          </summary>
          <ul className={styles.olderList}>
            <li className={cx(styles.box, styles.flat, styles.slot, styles.olderItem)} data-testid="ar-sandbox">
              <div>
                <div className={styles.olderName}>JDQ AR Sandbox</div>
                <div className={styles.olderMeta}>AR mini-games test app · installs beside JuanDerQuest</div>
              </div>
              <a
                href={AR_SANDBOX_URL}
                rel="noopener noreferrer"
                className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}
              >
                Download
              </a>
            </li>
            {older.map((release) => (
              <li key={release.versionCode} className={cx(styles.box, styles.flat, styles.slot, styles.olderItem)}>
                <div>
                  <div className={styles.olderName}>v{release.versionName}</div>
                  <div className={styles.olderMeta}>
                    {designLine(release.versionName)} · build {release.versionCode}
                    {formatSize(release.sizeBytes) && ` · ${formatSize(release.sizeBytes)}`}
                  </div>
                </div>
                <a
                  href={release.url}
                  rel="noopener noreferrer"
                  className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}
                >
                  v{release.versionName}
                </a>
              </li>
            ))}
          </ul>
          {older.length > 0 && (
            <p className={styles.small}>
              Android can&apos;t install an older JuanDerQuest over a newer one: uninstall it first. Your account and
              progress stay on the server.
            </p>
          )}
        </details>

        <footer className={styles.footer}>
          <div className={styles.footerLinks}>
            <Link href={reportBugHref}>Report a Bug</Link>
            <span aria-hidden="true">·</span>
            <Link href="/explore">Explore on Web</Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy">Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms">Terms</Link>
          </div>
          <span>JuanDerQuest Open Beta · Pangasinan, Philippines</span>
        </footer>
      </div>
    </main>
  );
}
