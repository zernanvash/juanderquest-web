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
});
