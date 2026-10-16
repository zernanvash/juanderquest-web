import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrailPreviewCard } from './TrailPreviewCard';

describe('TrailPreviewCard', () => {
  it('labels the feature honestly and never promises live routing', () => {
    render(<TrailPreviewCard />);
    expect(screen.getByText(/in development/i)).toBeTruthy();
    expect(screen.getByText(/not available yet/i)).toBeTruthy();
    expect(screen.getByText(/nothing is routed or promised today/i)).toBeTruthy();
    expect(screen.getByText(/not sent anywhere yet/i)).toBeTruthy();
  });

  it('toggles preference chips locally with aria-pressed state', () => {
    render(<TrailPreviewCard />);
    const scenic = screen.getByRole('button', { name: /scenic route/i });
    expect(scenic.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(scenic);
    expect(scenic.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(scenic);
    expect(scenic.getAttribute('aria-pressed')).toBe('false');
  });
});
