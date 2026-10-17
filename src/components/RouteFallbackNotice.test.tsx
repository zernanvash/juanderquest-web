import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteModel } from '@/lib/api';
import { RouteFallbackNotice } from './RouteFallbackNotice';

describe('RouteFallbackNotice', () => {
  it('labels a straight-line estimate and links out without showing duration guidance', () => {
    const route: RouteModel = {
      degraded: true,
      navigationMode: 'straight_line_estimate',
      warning: { code: 'OUTSIDE_ROUTING_COVERAGE', message: 'Road routing is unavailable for this trip.', coverageLabel: 'Pangasinan' },
      summary: {
        distanceKm: 12.4,
        durationSeconds: 3600,
        durationFormatted: '60 min',
        costing: 'auto',
        hasCrowdDiversion: false,
        engine: 'fallback_straight_line',
      },
      coordinates: [[16, 120], [16.1, 120.1]],
      maneuvers: [{ instruction: 'Turn left', distanceMeters: 100, timeSeconds: 30 }],
    };

    render(<RouteFallbackNotice route={route} destination={{ lat: 16.2, lng: 120.04 }} />);

    expect(screen.getByRole('status').textContent).toContain('Road routing is unavailable for this trip.');
    expect(screen.getByText(/12\.4 km straight-line distance/).textContent).toBeTruthy();
    expect(screen.queryByText('60 min')).toBeNull();
    expect(screen.queryByText('Turn left')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Google Maps' }).getAttribute('href')).toContain('destination=16.2,120.04');
    expect(screen.getByRole('link', { name: 'Open Waze' }).getAttribute('rel')).toBe('noopener noreferrer');
  });
});
