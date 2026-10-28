import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripPanel } from './TripPanel';
import type { SpotModel } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  planTrip: vi.fn(), fetchTrailsNear: vi.fn(), fetchTrail: vi.fn(), unlockTrail: vi.fn(), checkInTrailStop: vi.fn(), fetchRoute: vi.fn(),
  refreshProfile: vi.fn(), user: { id: 'traveler', points: 500 } as { id: string; points: number } | null,
}));
vi.mock('@/lib/trip-api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/trip-api')>()), planTrip: mocks.planTrip }));
vi.mock('@/lib/trails-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/trails-api')>()),
  fetchTrailsNear: mocks.fetchTrailsNear, fetchTrail: mocks.fetchTrail, unlockTrail: mocks.unlockTrail, checkInTrailStop: mocks.checkInTrailStop,
}));
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api')>()), fetchRoute: mocks.fetchRoute }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: mocks.user, refreshProfile: mocks.refreshProfile }) }));

const spot = { id: 'spot-bolinao', name: 'Patar Beach', municipality: 'Bolinao', gpsLat: 16.32, gpsLng: 119.78 } as SpotModel;
const hiyas = { id: 'hiyas-1', slug: 'hiyas-1', title: 'Bolinao – Bani Hiyas Trail', tagline: '6 stops · about 6 h · hand-picked gems', tier: 'signature', theme: 'Nature',
  municipalities: ['Bolinao', 'Bani'], stop_count: 2, total_minutes: 387, total_km: 40, unlock_rule: { type: 'points', price_points: 300 }, available_until: null,
  rarity_art_key: 'signature', is_unlocked: false, cover_image_url: null, passes_here: true, nearest_km: 0, reward_points: 200 };
const starter = { ...hiyas, id: 'starter-1', slug: 'starter-1', title: 'Bolinao Heritage & Nature Trail', tier: 'starter', unlock_rule: { type: 'free' }, passes_here: false, reward_points: 50 };
const stops = [
  { position: 1, spot_id: 'a', name: 'Cape Bolinao Lighthouse', municipality: 'Bolinao', category: 'culture_heritage', lat: 16.33, lng: 119.79, narration: 'Climb up.', arrive_offset_min: 0, dwell_min: 45, leg_minutes: 0, leg_km: 0, checkin_radius_m: 150, checked_in: false },
  { position: 2, spot_id: 'b', name: 'Enchanted Cave', municipality: 'Bolinao', category: 'nature_outdoors', lat: 16.36, lng: 119.88, narration: 'Swim.', arrive_offset_min: 60, dwell_min: 45, leg_minutes: 10, leg_km: 8, checkin_radius_m: 150, checked_in: false },
];
const route = (km: number) => ({ degraded: false, summary: { distanceKm: km, durationSeconds: 900, durationFormatted: '15 mins' }, coordinates: [[16.32, 119.78], [16.36, 119.88]], maneuvers: [{ instruction: 'Head north on Patar Road', distanceMeters: 800, timeSeconds: 60 }] });
let watchCallback: PositionCallback | null = null;

describe('TripPanel trails carousel (Plan 64)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'traveler', points: 500 };
    mocks.fetchTrailsNear.mockResolvedValue([hiyas, starter]);
    mocks.planTrip.mockImplementation(async (_s: unknown, _e: unknown, via: unknown[] = []) => ({
      baseline_route: { degraded: false, navigationMode: 'turn_by_turn', summary: { distanceKm: via.length ? 270 : 250, durationSeconds: 1, durationFormatted: '4 hrs' }, coordinates: [[14.6, 120.98], [16.32, 119.78]] },
      detour_areas: [{ municipality: 'Lingayen', detour_km: 31, extra_minutes: 101, score: 1, center: { lat: 16.02, lng: 120.23 }, spot_count: 3, highlights: [{ spot_id: 's1', name: 'Lingayen Beach', category: 'nature_outdoors' }] }],
    }));
    mocks.fetchRoute.mockResolvedValue(route(9));
    mocks.unlockTrail.mockReset().mockResolvedValue({ already_unlocked: false, price_points: 0 });
    mocks.refreshProfile.mockResolvedValue(undefined);
    watchCallback = null;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition: (ok: PositionCallback) => { watchCallback = ok; return 1; }, clearWatch: vi.fn(), getCurrentPosition: vi.fn(),
    } });
  });

  it('shows Direct route first, then trail cards with the Hiyas badge and price', async () => {
    render(<TripPanel spot={spot} onOverlay={vi.fn()} />);
    const list = await screen.findByRole('list', { name: 'Choose a trail' });
    const cards = await within(list).findAllByRole('button');
    expect(cards[0].textContent).toMatch(/Direct route/);
    expect(cards[1].textContent).toMatch(/Hiyas.*300 pts.*Bolinao – Bani Hiyas Trail/);
    expect(cards[1].textContent).toMatch(/Passes here/);
    expect(cards[2].textContent).toMatch(/Free.*Bolinao Heritage/);
    expect(mocks.fetchTrailsNear).toHaveBeenCalledWith({ lat: 16.32, lng: 119.78 }, 'spot-bolinao');
  });

  it('keeps the free direct route with detours', async () => {
    const onOverlay = vi.fn();
    render(<TripPanel spot={spot} onOverlay={onOverlay} />);
    fireEvent.click(await screen.findByRole('button', { name: /Direct route/ }));
    fireEvent.change(screen.getByLabelText(/From where/), { target: { value: 'Manila' } });
    expect(await screen.findByText('Lingayen')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    await waitFor(() => expect(mocks.planTrip).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), [{ lat: 16.02, lng: 120.23 }]));
    expect(onOverlay).toHaveBeenCalledWith(expect.objectContaining({ line: [[120.98, 14.6], [119.78, 16.32]] }));
  });

  it('previews a locked Hiyas Trail, unlocks it with points and starts navigating through its stops', async () => {
    mocks.fetchTrail.mockResolvedValueOnce({ ...hiyas, intro: 'Lighthouse to caves.', preview: [
      { name: 'Cape Bolinao Lighthouse', municipality: 'Bolinao', category: 'culture_heritage', image_url: null, blurb: 'A 1905 lighthouse.' },
      { name: 'Enchanted Cave', municipality: 'Bolinao', category: 'nature_outdoors', image_url: null, blurb: 'A cave pool.' },
    ] }).mockResolvedValueOnce({ ...hiyas, is_unlocked: true, stops });
    mocks.unlockTrail.mockResolvedValue({ already_unlocked: false, price_points: 300 });
    render(<TripPanel spot={spot} userLocation={{ lat: 16.32, lng: 119.78 }} onOverlay={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Bolinao – Bani Hiyas Trail/ }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('A 1905 lighthouse.')).toBeTruthy();
    expect(within(dialog).queryByRole('list', { name: 'Stops in order' })).toBeNull();
    expect(within(dialog).getAllByText(/Hiyas Trail/).length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole('button', { name: /Unlock & choose · 300 points/ }));
    expect(within(dialog).getByText(/Spend 300 points to unlock this Hiyas Trail\? Your balance: 500 points/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Spend 300 points/ }));
    expect(await screen.findByRole('region', { name: 'Trail navigation' })).toBeTruthy();
    expect(mocks.unlockTrail).toHaveBeenCalledWith('hiyas-1');
    expect(screen.getByText('Cape Bolinao Lighthouse', { selector: 'p' })).toBeTruthy();
    await waitFor(() => expect(mocks.fetchRoute).toHaveBeenCalledWith(expect.objectContaining({ startLat: 16.32, endLat: 16.36, via: [{ lat: 16.33, lng: 119.79 }] })));
    expect(await screen.findByText('Head north on Patar Road')).toBeTruthy();
  });

  it('explains a short balance inside the trail modal', async () => {
    mocks.fetchTrail.mockResolvedValue({ ...hiyas, preview: [] });
    mocks.unlockTrail.mockRejectedValue({ isAxiosError: true, response: { data: { error: { code: 'INSUFFICIENT_POINTS' } } } });
    render(<TripPanel spot={spot} onOverlay={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Bolinao – Bani Hiyas Trail/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Unlock & choose/ }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(within(dialog).getByRole('button', { name: /Unlock & choose/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Spend 300 points/ }));
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(/Not enough points/);
  });

  it('offers the check-in on arrival and pays the completion reward', async () => {
    mocks.fetchTrail.mockResolvedValue({ ...starter, is_unlocked: true, stops: [stops[0]] });
    mocks.checkInTrailStop.mockResolvedValue({ progress: [{ ...stops[0], checked_in: true }], completion: { reward_points: 50 } });
    render(<TripPanel spot={spot} onOverlay={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Bolinao Heritage & Nature Trail/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Choose this trail/ }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(within(dialog).getByRole('button', { name: /Choose this trail/ }));
    await screen.findByRole('region', { name: 'Trail navigation' });
    watchCallback?.({ coords: { latitude: 16.3301, longitude: 119.7901, accuracy: 10 } } as GeolocationPosition);
    fireEvent.click(await screen.findByRole('button', { name: /You're here · check in/ }));
    expect((await screen.findByRole('status')).textContent).toMatch(/Trail complete! \+50 points/);
    expect(mocks.checkInTrailStop).toHaveBeenCalledWith('starter-1', 1, expect.objectContaining({ lat: 16.3301, lng: 119.7901, accuracy_m: 10 }));
  });

  it('asks signed-out travelers to sign in before choosing', async () => {
    mocks.user = null;
    mocks.fetchTrail.mockResolvedValue({ ...starter, preview: [] });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    render(<TripPanel spot={spot} onOverlay={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Bolinao Heritage & Nature Trail/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Sign in to choose/ }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(within(dialog).getByRole('button', { name: /Sign in to choose/ }));
    expect(assign).toHaveBeenCalledWith('/login?redirect=%2Fmap%3Fspot%3Dspot-bolinao%26trip%3D1');
    expect(mocks.unlockTrail).not.toHaveBeenCalled();
  });
});
