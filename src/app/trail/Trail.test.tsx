import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrailClient } from './TrailClient';

vi.mock('@/components/Navigation', () => ({
  Navigation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nav-wrapper">{children}</div>
  ),
}));

vi.mock('@/lib/api', () => ({
  fetchTrailServiceArea: vi.fn().mockResolvedValue({
    id: 'pangasinan-pilot',
    name: 'Pangasinan Tourism Corridor Pilot',
    bbox: { min_lat: 15.5, max_lat: 16.5, min_lng: 119.5, max_lng: 121.0 },
    supported_modes: ['auto', 'motorcycle', 'bicycle', 'pedestrian'],
    road_graph_engine: 'valhalla',
    license: 'OpenStreetMap Contributors (ODbL 1.0)',
    data_sources: ['OpenStreetMap Road Network', 'Pangasinan Tourism Catalog'],
  }),
  planTrailRoute: vi.fn().mockResolvedValue({
    service_area: {
      id: 'pangasinan-pilot',
      name: 'Pangasinan Tourism Corridor Pilot',
      bbox: { min_lat: 15.5, max_lat: 16.5, min_lng: 119.5, max_lng: 121.0 },
      supported_modes: ['auto', 'motorcycle', 'bicycle', 'pedestrian'],
      road_graph_engine: 'valhalla',
      license: 'OpenStreetMap Contributors (ODbL 1.0)',
      data_sources: ['OpenStreetMap Road Network', 'Pangasinan Tourism Catalog'],
    },
    is_within_primary_service_area: true,
    baseline_route: {
      degraded: false,
      navigationMode: 'turn_by_turn',
      summary: {
        distanceKm: 52.4,
        durationSeconds: 4200,
        durationFormatted: '1 hr 10 mins',
        costing: 'auto',
        hasCrowdDiversion: false,
        engine: 'valhalla',
      },
      coordinates: [
        [16.0433, 120.3333],
        [16.2063, 119.9706],
      ],
      maneuvers: [],
    },
    suggested_stops: [
      {
        spot_id: 'spot-capitol',
        name: 'Pangasinan Provincial Capitol',
        category: 'culture_heritage',
        municipality: 'Lingayen',
        gps_lat: 16.0232,
        gps_lng: 120.2317,
        detour_km: 1.8,
        distance_from_start_km: 12.5,
        crowd_status: 'quiet',
        score: 98,
        reason_codes: ['MINIMAL_DETOUR', 'CALM_CROWD', 'CULTURAL_HERITAGE'],
        recommendation_label: 'Curated',
      },
    ],
    total_candidates_evaluated: 15,
    disclaimer: 'Deterministic corridor route and stop suggestions based on published destination coordinates.',
  }),
}));

describe('TrailClient Component', () => {
  it('renders Trail header and pilot preview badge', () => {
    render(<TrailClient />);

    expect(screen.getByRole('heading', { level: 1, name: /The Trail/i })).toBeDefined();
    expect(screen.getByText(/Pilot Preview • Deterministic Corridor Engine/i)).toBeDefined();
    expect(screen.getByText(/Starting Point \(Origin\)/i)).toBeDefined();
    expect(screen.getByText(/Final Destination/i)).toBeDefined();
  });

  it('allows clicking Plan Corridor Trail and displays suggested stops', async () => {
    render(<TrailClient />);

    const planBtn = screen.getByRole('button', { name: /Plan Corridor Trail/i });
    expect(planBtn).toBeDefined();

    fireEvent.click(planBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pangasinan Provincial Capitol/i)).toBeDefined();
    });

    expect(screen.getByText(/\+1.8 km detour/i)).toBeDefined();
    expect(screen.getByText(/MINIMAL DETOUR/i)).toBeDefined();
    expect(screen.getByText(/CALM CROWD/i)).toBeDefined();
  });
});
