'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { DitherBackdrop } from '../download/DitherBackdrop';
import { pixelBody, pixelTitle } from '../download/fonts';
import styles from './report-bug.module.css';

const CATEGORIES = [
  { id: 'crash', label: 'Crash / Freeze' },
  { id: 'auth', label: 'Login / Wallet' },
  { id: 'map', label: 'Map / Navigation' },
  { id: 'ar', label: 'AR / Camera' },
  { id: 'quests', label: 'Quests / Rewards' },
  { id: 'ui', label: 'UI / Visual' },
  { id: 'other', label: 'Other' },
] as const;

type BugCategory = (typeof CATEGORIES)[number]['id'];

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export function ReportBugClient() {
  const searchParams = useSearchParams();
  const initialVersion = searchParams.get('version') ?? '';

  const [category, setCategory] = useState<BugCategory>('crash');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [appVersion, setAppVersion] = useState(initialVersion || 'v0.3 BETA');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const androidMatch = /Android\s+([0-9.]+)/i.exec(ua);
    if (androidMatch && !deviceInfo) {
      setDeviceInfo(`Android ${androidMatch[1]}`);
    }
    if (!initialVersion) {
      fetch(`${API_BASE_URL}/app/version`)
        .then((res) => res.json())
        .then((res) => {
          const name = res?.data?.versionName;
          if (res?.success && name) {
            setAppVersion(`v${String(name).replace(/^v/i, '')} BETA`);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVersion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (summary.trim().length < 5) {
      setError('Please enter a short summary (at least 5 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please describe what happened (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          summary: summary.trim(),
          description: description.trim(),
          appVersion: appVersion.trim() || undefined,
          deviceInfo: deviceInfo.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          website,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? 'Could not submit bug report. Please try again.');
        return;
      }
      setReferenceCode(String(json.data?.referenceCode ?? 'BUG-RECEIVED'));
    } catch {
      setError('Network error while sending your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSummary('');
    setDescription('');
    setError(null);
    setReferenceCode(null);
    setCopiedRef(false);
  };

  const copyRef = async () => {
    if (!referenceCode) return;
    try {
      await navigator.clipboard.writeText(referenceCode);
    } catch {
      // Ignore clipboard errors in restricted browsers.
    }
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <main className={cx(pixelTitle.variable, pixelBody.variable, styles.screen)}>
      <DitherBackdrop top="#0d1b2a" bottom="#414844" />

      <div className={styles.column}>
        <nav className={styles.topBar} aria-label="Report a bug navigation">
          <Link href="/download" className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}>
            ◀ Download
          </Link>
          <Link href="/explore" className={cx(styles.box, styles.flat, styles.inkBox, styles.iconButton)}>
            Explore
          </Link>
        </nav>

        <header className={styles.header}>
          <h1 className={styles.title}>Report a Bug</h1>
          <p className={styles.subtitle}>
            JuanDerQuest is in Open Beta. Tell us what broke and we&apos;ll fix it.
          </p>
        </header>

        {referenceCode ? (
          <section className={cx(styles.box, styles.parchment, styles.panel)} data-testid="bug-report-success">
            <h2 className={styles.heading}>Report Received!</h2>
            <p className={styles.small}>
              Thank you for helping improve the JuanDerQuest Beta. Save your reference code below:
            </p>
            <div className={cx(styles.box, styles.flat, styles.slot, styles.refBox)}>
              <span className={styles.refCode} data-testid="bug-ref-code">
                {referenceCode}
              </span>
              <button
                type="button"
                className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}
                onClick={copyRef}
              >
                {copiedRef ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={cx(styles.box, styles.parchment, styles.button, styles.smallButton)}
                onClick={resetForm}
              >
                Submit another
              </button>
              <Link href="/download" className={cx(styles.box, styles.green, styles.button, styles.smallButton)}>
                <span className={styles.buttonText}>Back to Download</span>
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={cx(styles.box, styles.parchment, styles.panel)}
            noValidate
          >
            <div className={styles.field}>
              <label className={styles.label}>What went wrong?</label>
              <div className={styles.chipGrid} role="radiogroup" aria-label="Bug category">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={category === cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cx(
                      styles.box,
                      styles.flat,
                      category === cat.id ? styles.gold : styles.slot,
                      styles.catChip,
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="bug-summary" className={styles.label}>
                Short Summary *
              </label>
              <input
                id="bug-summary"
                type="text"
                required
                maxLength={120}
                placeholder="e.g. Map freezes when zooming in Bolinao"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="bug-description" className={styles.label}>
                What happened &amp; steps to reproduce *
              </label>
              <textarea
                id="bug-description"
                required
                rows={4}
                maxLength={2000}
                placeholder="Tell us what you tapped, what you expected, and what happened instead..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.textarea}
              />
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label htmlFor="bug-version" className={styles.label}>
                  App Version
                </label>
                <input
                  id="bug-version"
                  type="text"
                  maxLength={40}
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="bug-device" className={styles.label}>
                  Phone / OS (Optional)
                </label>
                <input
                  id="bug-device"
                  type="text"
                  maxLength={160}
                  placeholder="e.g. Samsung A54 · Android 14"
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="bug-email" className={styles.label}>
                Email for follow-up (Optional)
              </label>
              <input
                id="bug-email"
                type="email"
                maxLength={160}
                placeholder="you@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={styles.input}
              />
            </div>

            {/* Honeypot */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="bug-website">Website</label>
              <input
                id="bug-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <div role="alert" className={cx(styles.box, styles.red, styles.errorBox)}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={cx(styles.box, styles.green, styles.button)}
              style={{ width: '100%', minHeight: 52, marginTop: 8 }}
              data-testid="bug-submit"
            >
              <span className={styles.buttonText}>{submitting ? 'Sending report…' : 'Send Bug Report'}</span>
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
