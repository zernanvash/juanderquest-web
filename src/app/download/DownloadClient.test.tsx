import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadClient } from './DownloadClient';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./DitherBackdrop', () => ({
  DitherBackdrop: () => null,
}));

vi.mock('./fonts', () => ({
  pixelTitle: { variable: 'font-pixel-title' },
  pixelBody: { variable: 'font-pixel-body' },
}));

describe('Plan 114: Commercial DownloadClient', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            versionName: '0.3.10',
            versionCode: 225,
            fileName: 'juanderquest-v0.3.10.apk',
            sizeBytes: 54_000_000,
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows v0.3.n BETA, Open Beta disclaimer, Report Bug link, and hides developer clutter', async () => {
    render(<DownloadClient />);

    await waitFor(() => {
      expect(screen.getByTestId('latest-version').textContent).toBe('v0.3.10 BETA');
    });

    // Commercial elements & beta disclaimer + report bug links
    expect(screen.getByTestId('download-latest').textContent).toContain('Download for Android');
    expect(screen.getByTestId('beta-disclaimer').textContent).toContain('Heavily Under Development');
    expect(screen.getByTestId('disclaimer-report-bug').getAttribute('href')).toBe(
      '/report-bug?version=v0.3.10%20BETA',
    );
    expect(screen.getByTestId('nav-report-bug').getAttribute('href')).toBe(
      '/report-bug?version=v0.3.10%20BETA',
    );

    // Developer clutter must NOT appear
    expect(screen.queryByTestId('older-versions')).toBeNull();
    expect(screen.queryByText(/SHA-256/i)).toBeNull();
    expect(screen.queryByText(/dev\.zernanvash\.juanderquest/i)).toBeNull();
    expect(screen.queryByText(/build 225/i)).toBeNull();
  });

  it('lists the JDQ AR Sandbox and builds older than the promoted one under Other versions', async () => {
    const rel = (versionName: string, versionCode: number) => ({
      versionName,
      versionCode,
      tag: `android-v${versionName}+${versionCode}.1`,
      fileName: `juanderquest-${versionName}.apk`,
      url: `https://x/${versionCode}.apk`,
      sizeBytes: 0,
      publishedAt: '',
    });
    render(<DownloadClient releases={[rel('0.4.0', 227), rel('0.3.10', 225), rel('0.3.9', 224)]} />);

    const hrefs = () =>
      Array.from(screen.getByTestId('other-versions').querySelectorAll('a')).map((a) => a.getAttribute('href'));
    await waitFor(() => expect(hrefs()).toContain('https://x/224.apk'));
    expect(hrefs()).not.toContain('https://x/225.apk');
    expect(hrefs()).not.toContain('https://x/227.apk');
    expect(screen.getByTestId('ar-sandbox').querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com/zernanvash/juanderquest-mobile/releases/download/ar-sandbox-v1.0.0/jdq-ar-sandbox-v1.0.0.apk',
    );
  });
});
