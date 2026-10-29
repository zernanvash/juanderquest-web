import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpotDiscoveryStudio } from './SpotDiscoveryStudio';
import { jpegWithGps } from '@/lib/__fixtures__/jpeg-gps';
import { DRAFT_KEY, type InitialSpotLocation } from '@/lib/spot-location-handoff';
import type { SpotRecognition } from '@/lib/spot-posting';

const apiMock = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
const uploadMock = vi.hoisted(() => vi.fn());
const recognizeMock = vi.hoisted(() => vi.fn());
const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const celebrate = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => routerMock }));
vi.mock('@/lib/api', () => ({ api: apiMock, normalizeSpot: (spot: unknown) => spot, uploadSpotMedia: uploadMock }));
vi.mock('@/lib/cache', () => ({ invalidateCache: vi.fn() }));
vi.mock('@/lib/reverse-geocode', () => ({ recognizeSpot: recognizeMock }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { handle: 'juan' } }) }));
vi.mock('@/components/CelebrationEffects', () => ({ triggerCelebration: celebrate }));
// The map: a button that "pans" the reticle to a nearby point.
vi.mock('@/components/MiniMapPreview', () => ({
  MiniMapPreview: ({ lat, lng, onLocationChange }: { lat: number; lng: number; onLocationChange: (a: number, b: number, z?: number) => void }) =>
    <button type="button" data-testid="map" data-lat={lat} data-lng={lng} onClick={() => onLocationChange(16.33, 119.79, 17)}>map</button>,
}));

const recognition = (overrides: Partial<SpotRecognition> = {}): SpotRecognition => ({
  recognized: true, source: 'osm', place_name: 'Patar White Beach',
  name_suggestions: ['Patar White Beach', 'Patar Beach'],
  formatted_address: 'Patar Road, Brgy. Patar, Bolinao, Pangasinan', municipality: 'Bolinao', barangay: 'Brgy. Patar', province: 'Pangasinan',
  road: 'Patar Road', outside_pangasinan: false, suggested_category: 'nature_outdoors', suggested_subcategory: 'beach',
  suggested_details: { good_for: ['families'], best_time: ['sunset'], amenities: [], daily_hours: '', contact_number: '' },
  story_starters: ['Patar White Beach in Brgy. Patar, Bolinao with relaxing views and fresh air.'],
  nearby_duplicates: [],
  ...overrides,
});
const aimed = (overrides: Partial<InitialSpotLocation> = {}): InitialSpotLocation => ({
  pin: { lat: 16.3268, lng: 119.7842, zoom: 17 }, source: 'map-crosshair', recognition: recognition(), draft: null, ...overrides,
});

describe('Spot Discovery Studio (Plan 70)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    recognizeMock.mockResolvedValue(recognition({ place_name: null, barangay: 'Brgy. Concordia', municipality: 'Bolinao', name_suggestions: [] }));
    uploadMock.mockResolvedValue({ asset_id: 'asset-1', url: 'https://cdn/x.jpg', media_type: 'image' });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('opens on the handed-off place at once, with no second lookup and no raw coordinates', async () => {
    render(<SpotDiscoveryStudio initial={aimed()} />);
    expect(screen.getByDisplayValue('Patar White Beach')).toBeTruthy();
    expect(screen.getByText('Brgy. Patar, Bolinao, Pangasinan')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Explorer postcard preview' }).textContent).toContain('Patar White Beach');
    await act(async () => { await new Promise(r => setTimeout(r, 500)); });
    expect(recognizeMock).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/\b\d{1,3}\.\d{4,}\b/);
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled(); // an aimed pin is not overridden
  });

  it('saves the draft and keeps the URL on the pin while editing', async () => {
    render(<SpotDiscoveryStudio initial={aimed()} />);
    fireEvent.change(screen.getByLabelText('Destination name'), { target: { value: 'Secret cove' } });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).draft.name).toBe('Secret cove'));
    expect(routerMock.replace).toHaveBeenCalledWith('/map/add-spot?lat=16.326800&lng=119.784200&zoom=17', { scroll: false });
    expect(screen.getByText(/Draft saved/)).toBeTruthy();
  });

  it('re-recognizes when the map moves but keeps the name the traveler typed', async () => {
    render(<SpotDiscoveryStudio initial={aimed()} />);
    fireEvent.change(screen.getByLabelText('Destination name'), { target: { value: 'My own name' } });
    fireEvent.click(screen.getByTestId('map'));
    await waitFor(() => expect(recognizeMock).toHaveBeenCalledWith(16.33, 119.79, expect.anything()));
    expect(await screen.findByText('Brgy. Concordia, Bolinao, Pangasinan')).toBeTruthy();
    expect(screen.getByDisplayValue('My own name')).toBeTruthy();
  });

  it('snaps a fallback pin to the photo GPS, and offers it when the pin was aimed', async () => {
    const photo = () => new File([jpegWithGps(16.0294, 120.2289) as BlobPart], 'beach.jpg', { type: 'image/jpeg' });
    const first = render(<SpotDiscoveryStudio initial={aimed({ pin: { lat: 16.2, lng: 119.9, zoom: 14 }, source: 'fallback-anchor', recognition: null })} />);
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled(); // tier 3 for a guessed pin
    fireEvent.change(screen.getByTestId('gallery-input'), { target: { files: [photo()] } });
    expect(await screen.findByText(/Location set from your photo/)).toBeTruthy();
    expect(Number(screen.getByTestId('map').getAttribute('data-lat'))).toBeCloseTo(16.0294, 3);
    first.unmount();

    render(<SpotDiscoveryStudio initial={aimed()} />);
    fireEvent.change(screen.getByTestId('gallery-input'), { target: { files: [photo()] } });
    const move = await screen.findByRole('button', { name: 'Move pin to photo location' });
    expect(Number(screen.getByTestId('map').getAttribute('data-lat'))).toBeCloseTo(16.3268, 4);
    fireEvent.click(move);
    expect(Number(screen.getByTestId('map').getAttribute('data-lat'))).toBeCloseTo(16.0294, 3);
  });

  it('publishes once, celebrates, clears the draft and offers map, quest and navigation next steps', async () => {
    apiMock.post.mockResolvedValue({ data: { success: true, data: { id: 'spot-9', slug: 'patar-white-beach', name: 'Patar White Beach', municipality: 'Bolinao', category: 'nature_outdoors', description: 'x', gpsLat: 16.3268, gpsLng: 119.7842, imageUrl: '' } } });
    render(<SpotDiscoveryStudio initial={aimed()} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Patar White Beach in Brgy\. Patar/ }));
    const [publish] = screen.getAllByRole('button', { name: /publish spot/i });
    fireEvent.click(publish);
    fireEvent.click(publish);
    expect(await screen.findByText(/Pinned to the Pangasinan Atlas/)).toBeTruthy();
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({ name: 'Patar White Beach', municipality: 'Bolinao', gps_lat: 16.3268, gps_lng: 119.7842 });
    expect(celebrate).toHaveBeenCalled();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(screen.getByRole('link', { name: /View pin on map/ }).getAttribute('href')).toBe('/map?spot=spot-9&lat=16.3268&lng=119.7842&zoom=16');
    expect(screen.getByRole('link', { name: /Create a quest here/ }).getAttribute('href')).toBe('/spots/patar-white-beach/quests/new');
    expect(screen.getByText(/Discovered by @juan/)).toBeTruthy();
  });
});
