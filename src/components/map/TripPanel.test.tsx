import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripPanel } from './TripPanel';
import type { SpotModel } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  planTrip: vi.fn(), fetchTrails: vi.fn(), fetchTrail: vi.fn(), unlockTrail: vi.fn(), createPersonalTrail: vi.fn(), checkInTrailStop: vi.fn(),
  refreshProfile: vi.fn(), user: { id: 'traveler', points: 500 } as { id: string; points: number } | null,
}));
vi.mock('@/lib/trip-api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/trip-api')>()), planTrip: mocks.planTrip }));
vi.mock('@/lib/trails-api', () => ({
  fetchTrails: mocks.fetchTrails, fetchTrail: mocks.fetchTrail, unlockTrail: mocks.unlockTrail,
  createPersonalTrail: mocks.createPersonalTrail, checkInTrailStop: mocks.checkInTrailStop,
}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mocks.user, refreshProfile: mocks.refreshProfile }) }));

const spot = { id: 'spot-baguio', name: 'Burnham Park', municipality: 'Baguio', gpsLat: 16.4023, gpsLng: 120.596 } as SpotModel;
const plan = (km: number) => ({
  baseline_route: { degraded: false, navigationMode: 'turn_by_turn', summary: { distanceKm: km, durationSeconds: 14400, durationFormatted: '4 hrs' }, coordinates: [[14.5995, 120.9842], [16.4023, 120.596]] },
  detour_areas: [{ municipality: 'Lingayen', detour_km: 31, extra_minutes: 101, score: 120, center: { lat: 16.02, lng: 120.23 }, spot_count: 3, highlights: [{ spot_id: 's1', name: 'Lingayen Beach', category: 'nature_outdoors' }] }],
});
const trailDetail = {
  id: 'tailored-1', title: 'Your Baguio trail', total_minutes: 240, total_km: 12, tier: 'personal', is_unlocked: true,
  stops: [
    { position: 1, spot_id: 'a', name: 'Mines View', municipality: 'Baguio', category: 'nature_outdoors', lat: 16.42, lng: 120.62, narration: 'Start here.', arrive_offset_min: 0, dwell_min: 45, leg_minutes: 0, leg_km: 0, checkin_radius_m: 150, checked_in: false },
    { position: 2, spot_id: 'b', name: 'Session Road', municipality: 'Baguio', category: 'eat_drink', lat: 16.41, lng: 120.6, narration: 'Lunch.', arrive_offset_min: 60, dwell_min: 60, leg_minutes: 15, leg_km: 3, checkin_radius_m: 150, checked_in: false },
  ],
};

describe('TripPanel (Plan 64)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'traveler', points: 500 };
    mocks.fetchTrails.mockResolvedValue({ items: [], personalGeneration: { free_remaining: 0, price_points: 150 } });
    mocks.planTrip.mockImplementation(async (_s: unknown, _e: unknown, via: unknown[] = []) => plan(via.length ? 270 : 250));
    mocks.fetchTrail.mockResolvedValue(trailDetail);
    mocks.refreshProfile.mockResolvedValue(undefined);
  });

  it('plans a free route from a chosen origin, draws it, and reroutes through an added detour', async () => {
    const onOverlay = vi.fn();
    render(<TripPanel spot={spot} onOverlay={onOverlay} />);
    fireEvent.change(screen.getByLabelText(/From where/), { target: { value: 'Manila' } });
    expect(await screen.findByText('Lingayen')).toBeTruthy();
    expect(mocks.planTrip).toHaveBeenCalledWith({ lat: 14.5995, lng: 120.9842 }, { lat: 16.4023, lng: 120.596 }, []);
    expect(onOverlay).toHaveBeenLastCalledWith(expect.objectContaining({ line: [[120.9842, 14.5995], [120.596, 16.4023]] }));

    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    await waitFor(() => expect(mocks.planTrip).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), [{ lat: 16.02, lng: 120.23 }]));
    expect(await screen.findByText(/270 km/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Added/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('sells a tailored trail for 150 points and explains a short balance without leaving the panel', async () => {
    mocks.createPersonalTrail.mockRejectedValueOnce({ isAxiosError: true, response: { data: { error: { code: 'INSUFFICIENT_POINTS' } } } });
    render(<TripPanel spot={spot} onOverlay={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Make it a trail · 150 points/ }));
    fireEvent.click(screen.getByRole('button', { name: 'beach' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue · 150 points/ }));
    expect(screen.getByRole('dialog').textContent).toMatch(/150 points/);
    fireEvent.click(screen.getByRole('button', { name: /Confirm/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Not enough points/);
    expect(mocks.createPersonalTrail).toHaveBeenCalledWith({ themes: ['beach'], budget_min: 240, pace: 'balanced', start: { lat: 16.4023, lng: 120.596 } });

    mocks.createPersonalTrail.mockResolvedValueOnce({ trail: { id: 'tailored-1' }, charged_points: 150, free_generation_remaining: 0 });
    fireEvent.click(screen.getByRole('button', { name: /Confirm/ }));
    expect(await screen.findByRole('heading', { name: 'Your Baguio trail' })).toBeTruthy();
    expect(mocks.refreshProfile).toHaveBeenCalled();
  });

  it('runs the trail on the map: check-in at a stop and the completion reward', async () => {
    mocks.fetchTrails.mockResolvedValue({ items: [{ id: 'tailored-1', title: 'Your Baguio trail', tier: 'signature', municipalities: ['Baguio'], stop_count: 2, total_minutes: 240, total_km: 12, unlock_rule: { type: 'points', price_points: 300 }, is_unlocked: true }], personalGeneration: null });
    mocks.checkInTrailStop.mockResolvedValue({ progress: [{ ...trailDetail.stops[0], checked_in: true }, { ...trailDetail.stops[1], checked_in: true }], completion: { reward_points: 200 } });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 16.42, longitude: 120.62, accuracy: 12 } } as GeolocationPosition) } });
    const onOverlay = vi.fn();
    render(<TripPanel spot={spot} onOverlay={onOverlay} />);
    fireEvent.click(await screen.findByRole('button', { name: /Your Baguio trail/ }));
    expect(await screen.findByRole('heading', { name: 'Your Baguio trail' })).toBeTruthy();
    expect(onOverlay).toHaveBeenLastCalledWith(expect.objectContaining({ points: expect.arrayContaining([expect.objectContaining({ label: '1', kind: 'stop' })]) }));
    fireEvent.click(screen.getAllByRole('button', { name: /I'm here/ })[0]);
    expect((await screen.findByRole('status')).textContent).toMatch(/\+200 points/);
    expect(mocks.checkInTrailStop).toHaveBeenCalledWith('tailored-1', 1, { lat: 16.42, lng: 120.62, accuracy_m: 12 });
  });

  it('sends signed-out travelers to sign in and back to this destination', async () => {
    mocks.user = null;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    render(<TripPanel spot={spot} onOverlay={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Make it a trail/ }));
    expect(assign).toHaveBeenCalledWith('/login?redirect=%2Fmap%3Fspot%3Dspot-baguio%26trip%3D1');
    expect(mocks.createPersonalTrail).not.toHaveBeenCalled();
  });
});
