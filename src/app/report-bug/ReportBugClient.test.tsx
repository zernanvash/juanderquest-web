import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportBugClient } from './ReportBugClient';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('version=v0.3.10%20BETA'),
}));

vi.mock('../download/DitherBackdrop', () => ({
  DitherBackdrop: () => null,
}));

vi.mock('../download/fonts', () => ({
  pixelTitle: { variable: 'font-pixel-title' },
  pixelBody: { variable: 'font-pixel-body' },
}));

describe('Plan 114: ReportBugClient', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { referenceCode: 'BUG-A1B2C3', status: 'open' },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefills version from query, validates required fields, and renders reference code on submit', async () => {
    render(<ReportBugClient />);

    const versionInput = screen.getByLabelText('App Version') as HTMLInputElement;
    expect(versionInput.value).toBe('v0.3.10 BETA');

    // Empty submit triggers validation error
    fireEvent.click(screen.getByTestId('bug-submit'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('short summary');

    // Fill valid fields and submit
    fireEvent.change(screen.getByLabelText('Short Summary *'), {
      target: { value: 'AR screen stays black' },
    });
    fireEvent.change(screen.getByLabelText(/What happened/i), {
      target: { value: 'Opening AR quest in Baguio shows black camera view.' },
    });

    fireEvent.click(screen.getByTestId('bug-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('bug-report-success')).toBeTruthy();
      expect(screen.getByTestId('bug-ref-code').textContent).toContain('BUG-A1B2C3');
    });
  });
});
